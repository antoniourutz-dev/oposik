import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { MainTab } from '../../components/BottomDock';
import type { PracticeQuestionScopeFilter } from '../../practiceTypes';
import { clearSupabaseAuthStorage, supabase } from '../../supabaseClient';
import { GUEST_ENTRY_DEFAULT_SCOPE, GUEST_ENTRY_DEFAULT_TAB } from './practiceAuthTransitions';

/**
 * Acciones imperativas de auth y transición de sesión (invitado ↔ cuenta).
 *
 * Separado de:
 * - estado (`usePracticeAuthSessionState`): session / authReady
 * - suscripción Supabase (`usePracticeAuthSubscription`): init + onAuthStateChange
 *
 * Aquí solo viven callbacks disparados por la UI (login completado, entrar como invitado, cerrar sesión).
 */
export type UsePracticeAuthActionsParams = {
  isGuest: boolean;
  clearAccountContext: () => void;
  resetActiveSession: () => void;
  setActiveTab: Dispatch<SetStateAction<MainTab>>;
  setAuthReady: Dispatch<SetStateAction<boolean>>;
  setIsGuest: Dispatch<SetStateAction<boolean>>;
  setLoadingQuestions: Dispatch<SetStateAction<boolean>>;
  setQuestionsError: Dispatch<SetStateAction<string | null>>;
  setSelectedQuestionScope: Dispatch<SetStateAction<PracticeQuestionScopeFilter>>;
  setSession: Dispatch<SetStateAction<Session | null>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
};

export const usePracticeAuthActions = ({
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
}: UsePracticeAuthActionsParams) => {
  const handleSignedIn = useCallback(() => {
    setIsGuest(false);
    setAuthReady(false);
    setLoadingQuestions(true);
  }, [setAuthReady, setIsGuest, setLoadingQuestions]);

  const handleEnterGuest = useCallback(() => {
    setSession(null);
    clearAccountContext();
    resetActiveSession();
    setIsGuest(true);
    setQuestionsError(null);
    setSyncError(null);
    setLoadingQuestions(false);
    setActiveTab(GUEST_ENTRY_DEFAULT_TAB);
    setSelectedQuestionScope(GUEST_ENTRY_DEFAULT_SCOPE);
  }, [
    clearAccountContext,
    resetActiveSession,
    setActiveTab,
    setLoadingQuestions,
    setQuestionsError,
    setSelectedQuestionScope,
    setSession,
    setSyncError,
    setIsGuest,
  ]);

  const handleSignOut = useCallback(async () => {
    if (isGuest) {
      setIsGuest(false);
      setSession(null);
      clearAccountContext();
      resetActiveSession();
      setLoadingQuestions(false);
      setSyncError(null);
      setQuestionsError(null);
      setActiveTab(GUEST_ENTRY_DEFAULT_TAB);
      return;
    }

    await supabase.auth.signOut();
    clearSupabaseAuthStorage();
    setSession(null);
    clearAccountContext();
    resetActiveSession();
  }, [
    clearAccountContext,
    isGuest,
    resetActiveSession,
    setActiveTab,
    setLoadingQuestions,
    setQuestionsError,
    setSession,
    setSyncError,
    setIsGuest,
  ]);

  return {
    handleEnterGuest,
    handleSignOut,
    handleSignedIn,
  };
};
