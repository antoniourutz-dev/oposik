import { describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { MainTab } from '../../components/BottomDock';
import type { PracticeQuestionScopeFilter } from '../../practiceTypes';
import {
  applyAuthSignedInTransition,
  applyAuthSignedOutTransition,
  applyUiEnterGuestTransition,
  applyUiSignOutFromGuestTransition,
  applyUiSignedInTransition,
} from './practiceShellTransitions';

const buildDeps = () => {
  const setActiveTab = vi.fn();
  const setAuthReady = vi.fn();
  const setIsGuest = vi.fn();
  const setLoadingQuestions = vi.fn();
  const setQuestionsError = vi.fn();
  const setSelectedQuestionScope = vi.fn();
  const setSession = vi.fn();
  const setSyncError = vi.fn();
  const resetActiveSession = vi.fn();
  const clearAccountContext = vi.fn();

  return {
    clearAccountContext,
    resetActiveSession,
    setActiveTab: setActiveTab as unknown as Dispatch<SetStateAction<MainTab>>,
    setAuthReady: setAuthReady as unknown as Dispatch<SetStateAction<boolean>>,
    setIsGuest: setIsGuest as unknown as Dispatch<SetStateAction<boolean>>,
    setLoadingQuestions: setLoadingQuestions as unknown as Dispatch<SetStateAction<boolean>>,
    setQuestionsError: setQuestionsError as unknown as Dispatch<SetStateAction<string | null>>,
    setSelectedQuestionScope: setSelectedQuestionScope as unknown as Dispatch<
      SetStateAction<PracticeQuestionScopeFilter>
    >,
    setSession: setSession as unknown as Dispatch<SetStateAction<Session | null>>,
    setSyncError: setSyncError as unknown as Dispatch<SetStateAction<string | null>>,
    // raw spies for assertions
    _spies: {
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
    },
  };
};

describe('practiceShellTransitions', () => {
  it('applyUiSignedInTransition sale de invitado sin bloquear authReady ni dejar carga manual colgada', () => {
    const deps = buildDeps();
    applyUiSignedInTransition(deps);
    expect(deps._spies.setIsGuest).toHaveBeenCalledWith(false);
    expect(deps._spies.setAuthReady).toHaveBeenCalledWith(true);
    expect(deps._spies.setLoadingQuestions).toHaveBeenCalledWith(false);
  });

  it('applyUiEnterGuestTransition coordina limpieza + defaults', () => {
    const deps = buildDeps();
    applyUiEnterGuestTransition(deps);
    expect(deps._spies.setSession).toHaveBeenCalledWith(null);
    expect(deps._spies.clearAccountContext).toHaveBeenCalled();
    expect(deps._spies.resetActiveSession).toHaveBeenCalled();
    expect(deps._spies.setIsGuest).toHaveBeenCalledWith(true);
    expect(deps._spies.setQuestionsError).toHaveBeenCalledWith(null);
    expect(deps._spies.setSyncError).toHaveBeenCalledWith(null);
    expect(deps._spies.setLoadingQuestions).toHaveBeenCalledWith(false);
    expect(deps._spies.setActiveTab).toHaveBeenCalledWith('home');
    expect(deps._spies.setSelectedQuestionScope).toHaveBeenCalledWith('all');
  });

  it('applyUiSignOutFromGuestTransition resetea y vuelve a home', () => {
    const deps = buildDeps();
    applyUiSignOutFromGuestTransition(deps);
    expect(deps._spies.setIsGuest).toHaveBeenCalledWith(false);
    expect(deps._spies.setSession).toHaveBeenCalledWith(null);
    expect(deps._spies.clearAccountContext).toHaveBeenCalled();
    expect(deps._spies.resetActiveSession).toHaveBeenCalled();
    expect(deps._spies.setLoadingQuestions).toHaveBeenCalledWith(false);
    expect(deps._spies.setSyncError).toHaveBeenCalledWith(null);
    expect(deps._spies.setQuestionsError).toHaveBeenCalledWith(null);
    expect(deps._spies.setActiveTab).toHaveBeenCalledWith('home');
  });

  it('applyAuthSignedOutTransition coordina reset + authReady true', () => {
    const deps = buildDeps();
    applyAuthSignedOutTransition(deps);
    expect(deps._spies.resetActiveSession).toHaveBeenCalled();
    expect(deps._spies.setIsGuest).toHaveBeenCalledWith(false);
    expect(deps._spies.clearAccountContext).toHaveBeenCalled();
    expect(deps._spies.setSyncError).toHaveBeenCalledWith(null);
    expect(deps._spies.setQuestionsError).toHaveBeenCalledWith(null);
    expect(deps._spies.setLoadingQuestions).toHaveBeenCalledWith(false);
    expect(deps._spies.setAuthReady).toHaveBeenCalledWith(true);
  });

  it('applyAuthSignedInTransition no debe cerrar sesión activa; solo limpia errores + authReady true', () => {
    const deps = buildDeps();
    applyAuthSignedInTransition(deps);
    expect(deps._spies.resetActiveSession).not.toHaveBeenCalled();
    expect(deps._spies.setIsGuest).toHaveBeenCalledWith(false);
    expect(deps._spies.setQuestionsError).toHaveBeenCalledWith(null);
    expect(deps._spies.setSyncError).toHaveBeenCalledWith(null);
    expect(deps._spies.setAuthReady).toHaveBeenCalledWith(true);
  });
});

