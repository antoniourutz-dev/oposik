import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { PracticeQuestionScopeFilter } from '../practiceTypes';
import type { AccountIdentity } from '../services/accountApi';
import type { MainTab } from '../components/BottomDock';
import { buildPracticeCoachPlan } from '../domain/learningEngine';
import { PRACTICE_BATCH_SIZE } from '../practiceConfig';
import {
  clearSupabaseAuthStorage,
  getSafeSupabaseSession,
  supabase
} from '../supabaseClient';
import {
  GUEST_MAX_BLOCKS,
  persistGuestBlocksUsed,
  persistQuestionScope,
  readGuestBlocksUsed,
  readQuestionScope
} from './practiceAppStorage';
import { usePracticeDataController } from './usePracticeDataController';
import { usePracticeSessionFlow } from './usePracticeSessionFlow';

const GUEST_IDENTITY: AccountIdentity = {
  user_id: 'guest-preview',
  current_username: 'Invitado',
  is_admin: false,
  player_mode: 'generic',
  previous_usernames: []
};

export const usePracticeApp = () => {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [isGuest, setIsGuest] = useState(false);
  const [guestBlocksUsed, setGuestBlocksUsed] = useState(readGuestBlocksUsed);
  const [selectedQuestionScope, setSelectedQuestionScope] =
    useState<PracticeQuestionScopeFilter>(readQuestionScope);

  const {
    clearAccountContext,
    examTarget,
    examTargetError,
    handleSaveExamTarget,
    identity: accountIdentity,
    learningDashboard,
    learningDashboardV2,
    loadingQuestions,
    pressureInsights,
    pressureInsightsV2,
    profile,
    questionsCount,
    questionsError,
    recentSessions,
    reloadPracticeData,
    savingExamTarget,
    setLoadingQuestions,
    setQuestionsError,
    setSyncError,
    syncPracticeAfterSession,
    syncingState,
    syncError,
    weakCategories,
    weakQuestions
  } = usePracticeDataController({
    authReady,
    isGuest,
    selectedQuestionScope,
    sessionUserId: session?.user.id ?? null
  });

  const identity = isGuest ? GUEST_IDENTITY : accountIdentity;
  const guestBlocksRemaining = Math.max(0, GUEST_MAX_BLOCKS - guestBlocksUsed);
  const isGenericPlayer = !isGuest && identity?.player_mode === 'generic';
  const totalBatches = Math.max(1, Math.ceil(questionsCount / PRACTICE_BATCH_SIZE));
  const recommendedBatchStartIndex =
    selectedQuestionScope === 'all' &&
    profile &&
    profile.nextStandardBatchStartIndex < questionsCount
      ? profile.nextStandardBatchStartIndex
      : 0;
  const recommendedBatchNumber =
    Math.floor(recommendedBatchStartIndex / PRACTICE_BATCH_SIZE) + 1;

  const coachPlan = useMemo(
    () =>
      buildPracticeCoachPlan({
        learningDashboard,
        pressureInsights,
        examTarget,
        recommendedBatchNumber,
        totalBatches,
        batchSize: PRACTICE_BATCH_SIZE
      }),
    [
      examTarget,
      learningDashboard,
      pressureInsights,
      recommendedBatchNumber,
      totalBatches
    ]
  );

  const handleGuestBlockConsumed = useCallback((nextBlockNumber: number) => {
    setGuestBlocksUsed(nextBlockNumber);
    persistGuestBlocksUsed(nextBlockNumber);
  }, []);

  const {
    activeSession,
    answers,
    currentQuestion,
    currentQuestionIndex,
    goHome,
    handleAnswer,
    handleContinueAfterReview,
    handleEndSessionEarly,
    handleRetrySession,
    handleSimulacroTimeExpired,
    resetActiveSession,
    startAntiTrap,
    startFromBeginning,
    startGenericRecommended,
    startGuest,
    startMixed,
    startRandom,
    startSimulacro,
    startStandardSession,
    startWeakReview,
    view
  } = usePracticeSessionFlow({
    guestBlocksRemaining,
    guestBlocksUsed,
    isGuest,
    onGuestBlockConsumed: handleGuestBlockConsumed,
    questionsCount,
    recommendedBatchStartIndex,
    selectedQuestionScope,
    setLoadingQuestions,
    setQuestionsError,
    setSyncError,
    syncPracticeAfterSession,
    weakQuestions
  });

  const topBarSubtitle =
    view === 'review'
      ? 'Revision'
      : activeTab === 'home'
        ? 'Inicio'
        : activeTab === 'stats'
          ? 'Estadisticas'
          : activeTab === 'study'
            ? 'Estudio'
            : 'Perfil';

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
        setSyncError(
          error instanceof Error ? error.message : 'No se ha podido validar la sesion.'
        );
      } finally {
        if (active) {
          setAuthReady(true);
        }
      }
    };

    void initAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;

      setSession(nextSession);

      if (event === 'SIGNED_OUT') {
        resetActiveSession();
        setIsGuest(false);
        clearAccountContext();
        setSyncError(null);
        setQuestionsError(null);
        setLoadingQuestions(false);
        setAuthReady(true);
        return;
      }

      if (event === 'SIGNED_IN' && nextSession) {
        resetActiveSession();
        setIsGuest(false);
        setQuestionsError(null);
        setSyncError(null);
        setAuthReady(true);
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
    resetActiveSession,
    setLoadingQuestions,
    setQuestionsError,
    setSyncError
  ]);

  useEffect(() => {
    if (isGenericPlayer && activeTab === 'stats') {
      setActiveTab('home');
    }
  }, [activeTab, isGenericPlayer]);

  useEffect(() => {
    persistQuestionScope(selectedQuestionScope);
  }, [selectedQuestionScope]);

  const handleSignedIn = useCallback(() => {
    setIsGuest(false);
    setAuthReady(false);
    setLoadingQuestions(true);
  }, [setLoadingQuestions]);

  const handleEnterGuest = useCallback(() => {
    setSession(null);
    clearAccountContext();
    resetActiveSession();
    setIsGuest(true);
    setQuestionsError(null);
    setSyncError(null);
    setLoadingQuestions(false);
    setActiveTab('home');
    setSelectedQuestionScope('all');
  }, [
    clearAccountContext,
    resetActiveSession,
    setLoadingQuestions,
    setQuestionsError,
    setSyncError
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
      setActiveTab('home');
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
    setLoadingQuestions,
    setQuestionsError,
    setSyncError
  ]);

  const handleQuestionScopeChange = useCallback((questionScope: PracticeQuestionScopeFilter) => {
    setSelectedQuestionScope((currentScope) =>
      currentScope === questionScope ? currentScope : questionScope
    );
  }, []);

  return {
    activeSession,
    activeTab,
    answers,
    authReady,
    currentQuestion,
    currentQuestionIndex,
    examTarget,
    examTargetError,
    goHome,
    handleAnswer,
    handleContinueAfterReview,
    handleEndSessionEarly,
    handleRetrySession,
    handleSaveExamTarget,
    handleEnterGuest,
    handleQuestionScopeChange,
    handleSignedIn,
    handleSignOut,
    handleSimulacroTimeExpired,
    identity,
    isGuest,
    isGenericPlayer,
    learningDashboard,
    learningDashboardV2,
    loadingQuestions,
    pressureInsights,
    pressureInsightsV2,
    profile,
    questionsCount,
    questionsError,
    recentSessions,
    reloadPracticeData,
    recommendedBatchNumber,
    selectedQuestionScope,
    guestBlocksRemaining,
    guestMaxBlocks: GUEST_MAX_BLOCKS,
    savingExamTarget,
    session,
    coachPlan,
    startSimulacro,
    startAntiTrap,
    startFromBeginning,
    startGuest,
    startGenericRecommended,
    startMixed,
    startRandom,
    startRecommended: () => {
      switch (coachPlan.mode) {
        case 'mixed':
          startMixed();
          return;
        case 'random':
          startRandom();
          return;
        case 'anti_trap':
          startAntiTrap();
          return;
        case 'simulacro':
          startSimulacro();
          return;
        default:
          void startStandardSession(recommendedBatchStartIndex, selectedQuestionScope);
      }
    },
    startWeakReview,
    syncingState,
    syncError,
    topBarSubtitle,
    totalBatches,
    view,
    weakCategories,
    weakQuestions,
    setActiveTab
  };
};
