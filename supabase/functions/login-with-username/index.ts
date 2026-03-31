import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { requireEnv } from '../_shared/auth.ts';
import { createEdgeLogger } from '../_shared/observability.ts';

type LoginPayload = {
  username?: string;
  password?: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const invalidCredentialsResponse = () =>
  new Response(
    JSON.stringify({
      code: 'INVALID_CREDENTIALS',
      message: 'Usuario o contraseña incorrectos. Revisa tus datos.'
    }),
    { status: 401, headers: corsHeaders }
  );

const normalizeUsername = (value: string) => value.trim().toLowerCase();

Deno.serve(async (request) => {
  const log = createEdgeLogger('login-with-username', request);
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    log.warn('request.method_not_allowed', { method: request.method }, 'METHOD_NOT_ALLOWED', 405);
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Falla explícitamente si falta configuración crítica (evita estados ambiguos).
    requireEnv('SUPABASE_URL');
    requireEnv('SUPABASE_ANON_KEY');
    requireEnv('SUPABASE_SERVICE_ROLE_KEY');

    const payload = (await request.json()) as LoginPayload;
    const username = normalizeUsername(String(payload.username ?? ''));
    const password = String(payload.password ?? '');

    if (!username || !password) {
      log.warn('login.invalid_payload', undefined, 'INVALID_PAYLOAD', 401);
      return invalidCredentialsResponse();
    }

    log.info('login.start');

    const { data: principal } = await adminClient
      .schema('app')
      .rpc('resolve_login_principal', { p_username: username })
      .maybeSingle<{ user_id: string; internal_email: string }>();

    const internalEmail =
      principal?.internal_email || `missing_${crypto.randomUUID()}@auth.quantia.invalid`;

    const { data, error } = await authClient.auth.signInWithPassword({
      email: internalEmail,
      password
    });

    if (error || !data.session) {
      log.warn('login.invalid_credentials', undefined, 'LOGIN_FAILED', 401);
      return invalidCredentialsResponse();
    }

    log.info('login.success');
    return new Response(
      JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    log.error('login.failed', error, undefined, 'LOGIN_FAILED', 401);
    return invalidCredentialsResponse();
  }
});
