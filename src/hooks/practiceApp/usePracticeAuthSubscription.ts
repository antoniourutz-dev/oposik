import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSafeSupabaseSession, supabase } from '../../supabaseClient';

type UsePracticeAuthSubscriptionParams = {
  clearAccountContext: () => void;
  onAuthSignedIn: () => void;
  onAuthSignedOut: () => void;
  setAuthReady: Dispatch<SetStateAction<boolean>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  setSession: Dispatch<SetStateAction<Session | null>>;
};

/**
 * Inicializa la sesión y escucha cambios de auth. Debe ejecutarse después de tener
 * `resetActiveSession` del flujo de sesión (misma dependencia que el efecto original).
 */
export const usePracticeAuthSubscription = ({
  clearAccountContext,
  setAuthReady,
  onAuthSignedIn,
  onAuthSignedOut,
  setSyncError,
  setSession,
}: UsePracticeAuthSubscriptionParams) => {
  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      try {
        const currentSession = await getSafeSupabaseSession();
        if (!active) return;
        setSession(currentSession);

        if (!currentSession) {
          clearAccountContext();
        }
      } catch (error) {
        if (!active) return;
        setSyncError(error instanceof Error ? error.message : 'No se ha podido validar la sesion.');
      } finally {
        if (active) {
          setAuthReady(true);
        }
      }
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;

      setSession(nextSession);

      if (event === 'SIGNED_OUT') {
        onAuthSignedOut();
        return;
      }

      if (event === 'SIGNED_IN' && nextSession) {
        onAuthSignedIn();
        return;
      }

      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [
    clearAccountContext,
    onAuthSignedIn,
    onAuthSignedOut,
    setAuthReady,
    setSyncError,
    setSession,
  ]);
};
