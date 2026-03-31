import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { hasLocalAuthToken } from '../../supabaseClient';

/** Estado de sesión Supabase y bandera de arranque de auth (misma semántica que antes en usePracticeApp). */
export const usePracticeAuthSessionState = () => {
  const [authReady, setAuthReady] = useState(() => !hasLocalAuthToken());
  const [session, setSession] = useState<Session | null>(null);
  return { authReady, setAuthReady, session, setSession };
};
