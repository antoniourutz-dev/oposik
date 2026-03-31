import { useCallback, useMemo, useState } from 'react';
import type { AccountIdentity } from '../services/accountApi';
import { buildProvisionalAccountIdentity } from '../services/accountApi';
import { buildPracticeCoachPlan } from '../domain/learningEngine';
import { PRACTICE_BATCH_SIZE } from '../practiceConfig';
import { GUEST_MAX_BLOCKS, persistGuestBlocksUsed, readGuestBlocksUsed } from './practiceAppStorage';
import {
  computeGuestBlocksRemaining,
  computeRecommendedBatchNumber,
  computeRecommendedBatchStartIndex,
  computeTopBarSubtitle,
  computeTotalBatches,
} from './practiceApp/practiceAppDerived';
import { usePracticeAuthSessionState } from './practiceApp/usePracticeAuthSessionState';
import { usePracticeAuthSubscription } from './practiceApp/usePracticeAuthSubscription';
import { usePracticeShellNavigation } from './practiceApp/usePracticeShellNavigation';
import { usePracticeQuestionScope } from './practiceApp/usePracticeQuestionScope';
import { usePracticeShellTransitions } from './practiceApp/usePracticeShellTransitions';
import { usePracticeStartRecommended } from './practiceApp/usePracticeStartRecommended';
import { usePracticeDataController } from './usePracticeDataController';
import { usePracticeSessionFlow } from './usePracticeSessionFlow';

const GUEST_IDENTITY: AccountIdentity = {
  user_id: 'guest-preview',
  current_username: 'Invitado',
  is_admin: false,
  player_mode: 'generic',
  previous_usernames: [],
};

/**
 * Fachada de composición: datos (React Query), flujo de sesión de práctica, estado de shell de UI,
 * suscripción Supabase (`usePracticeAuthSubscription`), acciones de auth (`usePracticeAuthActions`) y
 * preferencia de ámbito de preguntas (`usePracticeQuestionScope`).
 * La API pública se mantiene estable para PracticeAppShell y pantallas lazy.
 */
export const usePracticeApp = () => {
  const { authReady, setAuthReady, session, setSession } = usePracticeAuthSessionState();
  const [isGuest, setIsGuest] = useState(false);
  const [guestBlocksUsed, setGuestBlocksUsed] = useState(readGuestBlocksUsed);
  const { handleQuestionScopeChange, selectedQuestionScope, setSelectedQuestionScope } =
    usePracticeQuestionScope();

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
    weakQuestions,
  } = usePracticeDataController({
    authReady,
    isGuest,
    selectedQuestionScope,
    sessionUserId: session?.user.id ?? null,
  });

  const identity = useMemo(() => {
    if (isGuest) return GUEST_IDENTITY;
    if (accountIdentity) return accountIdentity;
    if (session) return buildProvisionalAccountIdentity(session);
    return null;
  }, [isGuest, accountIdentity, session]);
  const guestBlocksRemaining = computeGuestBlocksRemaining(guestBlocksUsed, GUEST_MAX_BLOCKS);
  const isGenericPlayer = !isGuest && identity?.player_mode === 'generic';

  const { activeTab, setActiveTab } = usePracticeShellNavigation(isGenericPlayer);

  const recommendedBatchStartIndex = computeRecommendedBatchStartIndex(
    selectedQuestionScope,
    profile,
    questionsCount,
  );
  const totalBatches = computeTotalBatches(questionsCount, PRACTICE_BATCH_SIZE);
  const recommendedBatchNumber = computeRecommendedBatchNumber(
    recommendedBatchStartIndex,
    PRACTICE_BATCH_SIZE,
  );

  const coachPlan = useMemo(
    () =>
      buildPracticeCoachPlan({
        learningDashboard,
        pressureInsights,
        examTarget,
        recommendedBatchNumber,
        totalBatches,
        batchSize: PRACTICE_BATCH_SIZE,
      }),
    [examTarget, learningDashboard, pressureInsights, recommendedBatchNumber, totalBatches],
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
    startLawSession,
    startWeakReview,
    view,
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
    weakQuestions,
  });

  const topBarSubtitle = useMemo(() => computeTopBarSubtitle(view, activeTab), [view, activeTab]);

  const transitions = usePracticeShellTransitions({
    clearAccountContext,
    isGuest,
    resetActiveSession,
    setActiveTab,
    setAuthReady,
    setIsGuest,
    setLoadingQuestions,
    setQuestionsError,
    setSelectedQuestionScope,
    setSession,
    setSyncError,
  });
  const { handleEnterGuest, handleSignOut, handleSignedIn } = transitions;

  usePracticeAuthSubscription({
    clearAccountContext,
    onAuthSignedIn: transitions.handleAuthSignedIn,
    onAuthSignedOut: transitions.handleAuthSignedOut,
    setAuthReady,
    setSyncError,
    setSession,
  });

  const startRecommended = usePracticeStartRecommended({
    coachPlan,
    recommendedBatchStartIndex,
    selectedQuestionScope,
    startAntiTrap,
    startMixed,
    startRandom,
    startSimulacro,
    startStandardSession,
  });

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
    startRecommended,
    startWeakReview,
    syncingState,
    syncError,
    topBarSubtitle,
    totalBatches,
    view,
    weakCategories,
    weakQuestions,
    onStartLawTraining: startLawSession,
    setActiveTab,
  };
};
