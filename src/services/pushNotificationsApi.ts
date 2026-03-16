import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../supabase';

type PushSubscriptionRpcRow = {
  subscription_id: number;
  user_id: string;
  endpoint: string;
  is_active: boolean;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer | null) => {
  if (!buffer) return '';

  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
};

const getPushSubscriptionKeys = (subscription: PushSubscription) => ({
  p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
  auth: arrayBufferToBase64(subscription.getKey('auth'))
});

const getBrowserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid';
  } catch {
    return 'Europe/Madrid';
  }
};

const mapPushNotificationApiError = (
  error: Pick<PostgrestError, 'code' | 'message' | 'details' | 'hint'>
) => {
  if (error.code === 'PGRST106') {
    return 'Push backend-a ez dago prest: `app` schema ez dago APIan exposed.';
  }
  if (error.code === 'PGRST202') {
    return 'Push backend-a ez dago prest: falta da RPC funtzioa.';
  }
  if (error.code === '42501' || error.code === 'PGRST301') {
    return 'Saioa ez da baliozkoa. Hasi berriro saioa.';
  }

  const normalizedMessage = String(error.message ?? '').toLowerCase();
  if (normalizedMessage.includes('invalid_push_subscription')) {
    return 'Push harpidetzaren datuak baliogabeak dira.';
  }
  if (normalizedMessage.includes('invalid schema: app')) {
    return 'Push backend-a ez dago prest: `app` schema ez dago APIan exposed.';
  }
  if (normalizedMessage.includes('could not find the function')) {
    return 'Push backend-a ez dago prest: falta da RPC funtzioa.';
  }

  return `Push harpidetza ezin izan da gorde: ${error.message}`;
};

export const upsertPushSubscription = async (subscription: PushSubscription) => {
  const keys = getPushSubscriptionKeys(subscription);
  if (!subscription.endpoint || !keys.p256dh || !keys.auth) {
    throw new Error('Push harpidetzaren datuak osatu gabe daude.');
  }

  const { data, error } = await supabase
    .schema('app')
    .rpc('upsert_push_subscription', {
      p_endpoint: subscription.endpoint,
      p_p256dh: keys.p256dh,
      p_auth: keys.auth,
      p_user_agent: navigator.userAgent,
      p_timezone: getBrowserTimezone()
    })
    .maybeSingle();

  if (error) {
    throw new Error(mapPushNotificationApiError(error));
  }

  return (data ?? null) as PushSubscriptionRpcRow | null;
};

export const deleteMyPushSubscription = async (endpoint: string) => {
  const normalizedEndpoint = endpoint.trim();
  if (!normalizedEndpoint) return 0;

  const { data, error } = await supabase
    .schema('app')
    .rpc('delete_my_push_subscription', {
      p_endpoint: normalizedEndpoint
    });

  if (error) {
    throw new Error(mapPushNotificationApiError(error));
  }

  return Number(data ?? 0);
};
