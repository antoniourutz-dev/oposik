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
    const lastUserIdRef = { current: null as string | null };

    const initAuth = async () => {
      try {
        const currentSession = await getSafeSupabaseSession();
        if (!active) return;
        setSession(currentSession);
        lastUserIdRef.current = currentSession?.user.id ?? null;

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
        lastUserIdRef.current = null;
        onAuthSignedOut();
        return;
      }

      if (event === 'SIGNED_IN' && nextSession) {
        const nextUserId = nextSession.user.id;
        const prevUserId = lastUserIdRef.current;
        lastUserIdRef.current = nextUserId;
        // Si es el mismo usuario (p. ej. rehidratación/refresh token al volver a la pestaña),
        // NO resetees la sesión activa de práctica.
        if (prevUserId && prevUserId === nextUserId) {
          setAuthReady(true);
          return;
        }
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
