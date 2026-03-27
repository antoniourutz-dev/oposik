import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const payload = (await request.json()) as LoginPayload;
    const username = normalizeUsername(String(payload.username ?? ''));
    const password = String(payload.password ?? '');

    const { data: principal } = await adminClient
      .schema('app')
      .rpc('resolve_login_principal', { p_username: username })
      .maybeSingle<{ user_id: string; internal_email: string }>();

    const internalEmail =
      principal?.internal_email || `missing_${crypto.randomUUID()}@auth.oposik.invalid`;

    const { data, error } = await authClient.auth.signInWithPassword({
      email: internalEmail,
      password
    });

    if (error || !data.session) {
      return invalidCredentialsResponse();
    }

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
    console.error('login-with-username error', error);
    return invalidCredentialsResponse();
  }
});
