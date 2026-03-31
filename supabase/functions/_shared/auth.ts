import { createClient } from 'npm:@supabase/supabase-js@2';

export const requireEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
};

export const readBearerToken = (request: Request): string | null => {
  const raw = request.headers.get('Authorization') ?? request.headers.get('authorization');
  if (!raw) return null;
  const match = raw.match(/^\s*Bearer\s+(.+)\s*$/i);
  return match?.[1] ? match[1].trim() : null;
};

export const createSupabaseAuthClient = () => {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export const createSupabaseServiceClient = () => {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export const requireAuthenticatedUser = async (request: Request) => {
  const token = readBearerToken(request);
  if (!token) {
    throw new Error('missing_authorization');
  }

  const authClient = createSupabaseAuthClient();
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) {
    throw new Error('not_authenticated');
  }

  return { token, user };
};

