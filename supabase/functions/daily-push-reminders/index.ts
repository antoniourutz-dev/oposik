import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { corsHeaders } from '../_shared/cors.ts';

type DueReminderRow = {
  subscription_id: number;
  user_id: string;
  current_username: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
  reminder_day_key: string;
  day_index: number;
};

type WebPushResponse = {
  statusCode?: number;
};

type WebPushError = Error & {
  statusCode?: number;
  body?: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const dailyPushReminderCronSecret = Deno.env.get('DAILY_PUSH_REMINDER_CRON_SECRET') || '';
const webPushPublicKey = Deno.env.get('WEB_PUSH_PUBLIC_KEY') || '';
const webPushPrivateKey = Deno.env.get('WEB_PUSH_PRIVATE_KEY') || '';
const webPushSubject = Deno.env.get('WEB_PUSH_SUBJECT') || '';

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

let vapidConfigured = false;

const ensureAuthorized = (request: Request) => {
  const authorization = request.headers.get('authorization') || '';
  return dailyPushReminderCronSecret && authorization === `Bearer ${dailyPushReminderCronSecret}`;
};

const ensureRuntimeConfiguration = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  if (!dailyPushReminderCronSecret) {
    throw new Error('Missing DAILY_PUSH_REMINDER_CRON_SECRET.');
  }
  if (!webPushPublicKey || !webPushPrivateKey || !webPushSubject) {
    throw new Error('Missing WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY or WEB_PUSH_SUBJECT.');
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(webPushSubject, webPushPublicKey, webPushPrivateKey);
    vapidConfigured = true;
  }
};

const getErrorStatusCode = (error: unknown) => {
  const maybeError = error as WebPushError | null;
  return typeof maybeError?.statusCode === 'number' ? maybeError.statusCode : null;
};

const getErrorMessage = (error: unknown) => {
  const maybeError = error as WebPushError | null;
  if (maybeError?.body) return maybeError.body;
  if (maybeError?.message) return maybeError.message;
  return 'Unknown push delivery error';
};

const isInactiveSubscriptionStatus = (statusCode: number | null) =>
  statusCode === 404 || statusCode === 410;

const markDeliverySuccess = async (row: DueReminderRow, statusCode: number | null) => {
  const deliveredAt = new Date().toISOString();

  const { error: logError } = await adminClient
    .schema('app')
    .from('push_notification_delivery_log')
    .upsert(
      {
        subscription_id: row.subscription_id,
        reminder_day_key: row.reminder_day_key,
        day_index: row.day_index,
        sent_at: deliveredAt,
        response_code: statusCode
      },
      { onConflict: 'subscription_id,reminder_day_key' }
    );

  if (logError) {
    throw logError;
  }

  const { error: updateError } = await adminClient
    .schema('app')
    .from('push_subscriptions')
    .update({
      is_active: true,
      last_success_at: deliveredAt,
      last_failure_at: null,
      failure_reason: null
    })
    .eq('id', row.subscription_id);

  if (updateError) {
    throw updateError;
  }
};

const markDeliveryFailure = async (
  row: DueReminderRow,
  reason: string,
  statusCode: number | null
) => {
  const { error } = await adminClient
    .schema('app')
    .from('push_subscriptions')
    .update({
      is_active: !isInactiveSubscriptionStatus(statusCode),
      last_failure_at: new Date().toISOString(),
      failure_reason: `${statusCode ?? 'unknown'}:${reason}`.slice(0, 500)
    })
    .eq('id', row.subscription_id);

  if (error) {
    throw error;
  }
};

const sendReminder = async (row: DueReminderRow) => {
  const payload = JSON.stringify({
    title: 'KORRIKA zure zain dago',
    body: 'Oraindik ez duzu gaurko saioa egin. Zatoz eta ekin gaurko erronkari.',
    tag: `korrika-reminder-${row.reminder_day_key}`,
    icon: '/korrika_icon_set/icon_192.png',
    badge: '/korrika_icon_set/icon_128.png',
    data: {
      url: '/',
      dayIndex: row.day_index,
      reminderDayKey: row.reminder_day_key
    }
  });

  try {
    const response = (await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth_secret
        }
      },
      payload,
      {
        TTL: 60 * 60 * 12,
        urgency: 'high'
      }
    )) as WebPushResponse;

    const statusCode = typeof response?.statusCode === 'number' ? response.statusCode : null;
    await markDeliverySuccess(row, statusCode);

    return {
      delivered: true,
      deactivated: false
    };
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    const reason = getErrorMessage(error);

    await markDeliveryFailure(row, reason, statusCode);

    return {
      delivered: false,
      deactivated: isInactiveSubscriptionStatus(statusCode)
    };
  }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  if (!ensureAuthorized(request)) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders
    });
  }

  try {
    ensureRuntimeConfiguration();

    const { data, error } = await adminClient
      .schema('app')
      .rpc('list_due_daily_push_reminders', {
        p_reference_time: new Date().toISOString(),
        p_days_count: 11,
        p_timezone: 'Europe/Madrid'
      });

    if (error) {
      throw error;
    }

    const dueRows = (data ?? []) as DueReminderRow[];
    const results = await Promise.all(dueRows.map((row) => sendReminder(row)));
    const delivered = results.filter((result) => result.delivered).length;
    const deactivated = results.filter((result) => result.deactivated).length;

    return new Response(
      JSON.stringify({
        processed: dueRows.length,
        delivered,
        failed: dueRows.length - delivered,
        deactivated
      }),
      {
        status: 200,
        headers: corsHeaders
      }
    );
  } catch (error) {
    console.error('daily-push-reminders error', error);
    return new Response(
      JSON.stringify({
        message: error instanceof Error ? error.message : 'Unexpected error'
      }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
