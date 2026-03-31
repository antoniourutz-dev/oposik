import { useCallback, useMemo } from 'react';
import { clearSupabaseAuthStorage, supabase } from '../../supabaseClient';
import type { PracticeShellTransitionDeps } from './practiceShellTransitions';
import {
  applyAuthSignedInTransition,
  applyAuthSignedOutTransition,
  applyUiEnterGuestTransition,
  applyUiSignOutFromGuestTransition,
  applyUiSignedInTransition,
} from './practiceShellTransitions';

export type UsePracticeShellTransitionsParams = PracticeShellTransitionDeps & {
  isGuest: boolean;
};

/**
 * Transiciones coordinadas del sistema (shell / práctica / auth).
 *
 * Esta unidad define explícitamente acciones que tocan varias piezas a la vez y se disparan desde:
 * - UI (login completado, entrar como invitado, cerrar sesión)
 * - infraestructura (eventos Supabase SIGNED_IN / SIGNED_OUT) a través de `usePracticeAuthSubscription`
 */
export const usePracticeShellTransitions = ({
  isGuest,
  clearAccountContext,
  resetActiveSession,
  setActiveTab,
  setAuthReady,
  setIsGuest,
  setLoadingQuestions,
  setQuestionsError,
  setSelectedQuestionScope,
  setSession,
  setSyncError,
}: UsePracticeShellTransitionsParams) => {
  const deps = useMemo<PracticeShellTransitionDeps>(
    () => ({
      clearAccountContext,
      resetActiveSession,
      setActiveTab,
      setAuthReady,
      setIsGuest,
      setLoadingQuestions,
      setQuestionsError,
      setSelectedQuestionScope,
      setSession,
      setSyncError,
    }),
    [
      clearAccountContext,
      resetActiveSession,
      setActiveTab,
      setAuthReady,
      setIsGuest,
      setLoadingQuestions,
      setQuestionsError,
      setSelectedQuestionScope,
      setSession,
      setSyncError,
    ],
  );

  const handleSignedIn = useCallback(() => {
    applyUiSignedInTransition(deps);
  }, [deps]);

  const handleEnterGuest = useCallback(() => {
    applyUiEnterGuestTransition(deps);
  }, [deps]);

  const handleSignOut = useCallback(async () => {
    if (isGuest) {
      applyUiSignOutFromGuestTransition(deps);
      return;
    }

    await supabase.auth.signOut();
    clearSupabaseAuthStorage();
    deps.setSession(null);
    deps.clearAccountContext();
    deps.resetActiveSession();
  }, [deps, isGuest]);

  const handleAuthSignedOut = useCallback(() => {
    applyAuthSignedOutTransition(deps);
  }, [deps]);

  const handleAuthSignedIn = useCallback(() => {
    applyAuthSignedInTransition(deps);
  }, [deps]);

  return {
    // UI-driven transitions
    handleEnterGuest,
    handleSignOut,
    handleSignedIn,
    // Infra-driven transitions (used by auth subscription)
    handleAuthSignedIn,
    handleAuthSignedOut,
  };
};

