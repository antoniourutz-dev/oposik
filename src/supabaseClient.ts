import { createClient, Session } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from './supabaseConfig';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const supabaseAuthStorageKey = `sb-${projectRef}-auth-token`;

/**
 * Returns true if there is a locally-stored auth token that *looks* valid,
 * without making any network request. Used as a fast hint to decide the
 * initial UI state before getSession() resolves.
 */
export const hasLocalAuthToken = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(supabaseAuthStorageKey);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const expiresAt: number | undefined = parsed?.expires_at ?? parsed?.expiresAt;
    if (expiresAt !== undefined && expiresAt * 1000 < Date.now()) return false;
    return Boolean(parsed?.access_token ?? parsed?.accessToken);
  } catch {
    return false;
  }
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
};

export const isInvalidRefreshTokenError = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found')
  );
};

export const clearSupabaseAuthStorage = () => {
  if (typeof window === 'undefined') return;

  const storageKeys = [
    supabaseAuthStorageKey,
    `${supabaseAuthStorageKey}-code-verifier`,
    'supabase.auth.token',
    'supabase.auth.token-code-verifier'
  ];

  for (const key of storageKeys) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

export const getSafeSupabaseSession = async (): Promise<Session | null> => {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (!error) {
    return session;
  }

  if (isInvalidRefreshTokenError(error)) {
    clearSupabaseAuthStorage();
    return null;
  }

  throw error;
};
