import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AccountIdentity } from '../services/accountApi';
import { buildProvisionalAccountIdentity } from '../services/accountApi';
import { buildPracticeCoachPlanV2Bundle, toCoachDecisionLog } from '../domain/learningEngine';
import { PRACTICE_BATCH_SIZE } from '../practiceConfig';
import {
  GUEST_MAX_BLOCKS,
  persistGuestBlocksUsed,
  readGuestBlocksUsed,
} from './practiceAppStorage';
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
import { useActiveLearningContext } from './useActiveLearningContext';
import { useLearningContextSelector } from './useLearningContextSelector';
import { usePracticeDataController } from './usePracticeDataController';
import { usePracticeSessionFlow } from './usePracticeSessionFlow';
import {
  readTextHighlightPreference,
  writeTextHighlightPreference,
} from '../services/textHighlightPreferenceStorage';
import { DEFAULT_CURRICULUM } from '../practiceConfig';
import type { LearningContextOption } from '../domain/learningContext/types';
import { GENERAL_LAW_CURRICULUM_KEY } from '../domain/learningContext/catalog';
import { readStoredLearningContextSelection } from '../lib/learningContext/activeLearningContextStorage';

const GUEST_IDENTITY: AccountIdentity = {
  user_id: 'guest-preview',
  current_username: 'Invitado',
  is_admin: false,
  player_mode: 'generic',
  previous_usernames: [],
};

const debugCoachV2 = import.meta.env.DEV || import.meta.env.VITE_COACH_V2_DEBUG === '1';

/**
 * Fachada de composición: datos (React Query), flujo de sesión de práctica, estado de shell de UI,
 * suscripción Supabase (`usePracticeAuthSubscription`), acciones de auth (`usePracticeAuthActions`) y
 * preferencia de ámbito de preguntas (`usePracticeQuestionScope`).
 * La API pública se mantiene estable para PracticeAppShell y pantallas lazy.
 */
export const usePracticeApp = () => {
  const { authReady, setAuthReady, session, setSession } = usePracticeAuthSessionState();
  const [isGuest, setIsGuest] = useState(false);
  const [isLearningContextPickerOpen, setIsLearningContextPickerOpen] = useState(false);
  const [guestBlocksUsed, setGuestBlocksUsed] = useState(readGuestBlocksUsed);
  const { handleQuestionScopeChange, selectedQuestionScope, setSelectedQuestionScope } =
    usePracticeQuestionScope();

  const [textHighlightingEnabled, setTextHighlightingEnabledState] = useState(
    readTextHighlightPreference,
  );
  const activeLearningContext = useActiveLearningContext(session?.user.id ?? null);
  const learningContextSelector = useLearningContextSelector(session?.user.id ?? null);
  /** Fuerza el currículo correcto para `general_law` y evita carreras con la query remota. */
  const curriculumKey = useMemo(() => {
    if (isGuest) return DEFAULT_CURRICULUM;

    const uid = session?.user?.id;
    const stored = uid ? readStoredLearningContextSelection(uid) : null;
    if (stored?.contextType === 'general_law') {
      return stored.curriculumKey ?? GENERAL_LAW_CURRICULUM_KEY;
    }

    const ctx = activeLearningContext.data;
    if (ctx?.contextType === 'general_law') {
      return ctx.curriculumKey ?? GENERAL_LAW_CURRICULUM_KEY;
    }

    return ctx?.curriculumKey ?? null;
  }, [activeLearningContext.data, isGuest, session?.user?.id]);

  const setTextHighlightingEnabled = useCallback((enabled: boolean) => {
    setTextHighlightingEnabledState(enabled);
    writeTextHighlightPreference(enabled);
  }, []);

  const openLearningContextPicker = useCallback(() => {
    setIsLearningContextPickerOpen(true);
  }, []);

  const closeLearningContextPicker = useCallback(() => {
    setIsLearningContextPickerOpen(false);
  }, []);

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
    curriculum: curriculumKey,
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

  const studyTopicScopeCounts = useMemo(() => {
    const topics = learningDashboardV2?.topicBreakdown ?? [];
    let common = 0;
    let specific = 0;
    for (const t of topics) {
      if (t.scope === 'common') common += t.questionCount ?? 0;
      if (t.scope === 'specific') specific += t.questionCount ?? 0;
    }
    return { common, specific };
  }, [learningDashboardV2?.topicBreakdown]);

  const recommendedBatchStartIndexCommon = useMemo(
    () =>
      computeRecommendedBatchStartIndex('common', profile, studyTopicScopeCounts.common),
    [profile, studyTopicScopeCounts.common],
  );
  const recommendedBatchStartIndexSpecific = useMemo(
    () =>
      computeRecommendedBatchStartIndex('specific', profile, studyTopicScopeCounts.specific),
    [profile, studyTopicScopeCounts.specific],
  );

  const totalBatches = computeTotalBatches(questionsCount, PRACTICE_BATCH_SIZE);
  const recommendedBatchNumber = computeRecommendedBatchNumber(
    recommendedBatchStartIndex,
    PRACTICE_BATCH_SIZE,
  );

  const { coachPlan, planV2, coachPlanV2ForDebug } = useMemo(() => {
    const { coachPlan: nextCoachPlan, planV2 } = buildPracticeCoachPlanV2Bundle({
      learningDashboard,
      learningDashboardV2,
      pressureInsights,
      pressureInsightsV2,
      examTarget,
      recentSessions,
      recommendedBatchNumber,
      totalBatches,
      batchSize: PRACTICE_BATCH_SIZE,
    });
    // Compatibilidad: exponemos `planV2` (fuente de verdad) y mantenemos el alias legacy debug.
    return { coachPlan: nextCoachPlan, planV2, coachPlanV2ForDebug: planV2 };
  }, [
    examTarget,
    learningDashboard,
    learningDashboardV2,
    pressureInsights,
    pressureInsightsV2,
    recentSessions,
    recommendedBatchNumber,
    totalBatches,
  ]);

  const coachDecisionLog = useMemo(
    () => (debugCoachV2 ? toCoachDecisionLog(coachPlanV2ForDebug) : null),
    [coachPlanV2ForDebug],
  );

  useEffect(() => {
    if (!debugCoachV2 || !coachDecisionLog) return;
    // Observabilidad local: inspección/calibración en runtime (sin analytics externos).
    console.debug('[coach-v2]', coachDecisionLog);
  }, [coachDecisionLog]);

  useEffect(() => {
    if (!session || isGuest) {
      setIsLearningContextPickerOpen(false);
    }
  }, [isGuest, session]);

  const handleGuestBlockConsumed = useCallback((nextBlockNumber: number) => {
    setGuestBlocksUsed(nextBlockNumber);
    persistGuestBlocksUsed(nextBlockNumber);
  }, []);

  const handleSelectLearningContext = useCallback(
    async (context: LearningContextOption) => {
      await learningContextSelector.selectLearningContext(context);
      setIsLearningContextPickerOpen(false);
    },
    [learningContextSelector],
  );

  const {
    activeSession,
    answers,
    currentQuestion,
    currentQuestionIndex,
    goHome,
    handleAnswer,
    handleCatalogReviewNext,
    handleContinueAfterReview,
    handleEndSessionEarly,
    handleRetrySession,
    handleSimulacroTimeExpired,
    pauseActiveSession,
    resumeActiveSession,
    resetActiveSession,
    startAntiTrap,
    startCatalogReview,
    startFromBeginning,
    startGenericRecommended,
    startGuest,
    startMixed,
    startQuickFive,
    startRandom,
    startSimulacro,
    startStandardSession,
    startLawSession,
    startLawFullCatalogSession,
    startLawLpacapTitleSession,
    startTopicSession,
    startWeakReview,
    view,
  } = usePracticeSessionFlow({
    guestBlocksRemaining,
    guestBlocksUsed,
    isGuest,
    curriculum: curriculumKey ?? DEFAULT_CURRICULUM,
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

  const onStartStudyQuickFive = useCallback(() => {
    void startQuickFive('all');
  }, [startQuickFive]);

  const onStartStudySimulacro = useCallback(() => {
    void startSimulacro('all');
  }, [startSimulacro]);

  const onStartStudyAllTest = useCallback(() => {
    void startStandardSession(recommendedBatchStartIndex, 'all');
  }, [startStandardSession, recommendedBatchStartIndex]);

  const onStartStudyCommonTest = useCallback(() => {
    void startStandardSession(recommendedBatchStartIndexCommon, 'common');
  }, [startStandardSession, recommendedBatchStartIndexCommon]);

  const onStartStudySpecificTest = useCallback(() => {
    void startStandardSession(recommendedBatchStartIndexSpecific, 'specific');
  }, [startStandardSession, recommendedBatchStartIndexSpecific]);

  const onStartLawLpacapTitleTraining = useCallback(
    (ley: string, titulo: string) => {
      void startLawLpacapTitleSession(ley, titulo);
    },
    [startLawLpacapTitleSession],
  );

  const onStartLawFullCatalogTraining = useCallback(
    (ley: string) => {
      void startLawFullCatalogSession(ley);
    },
    [startLawFullCatalogSession],
  );

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
    activeLearningContext: activeLearningContext.data,
    recommendedBatchStartIndex,
    selectedQuestionScope,
    startAntiTrap,
    startMixed,
    startQuickFive,
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
    handleCatalogReviewNext,
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
    planV2,
    startSimulacro,
    startAntiTrap,
    startCatalogReview,
    startFromBeginning,
    startGuest,
    startGenericRecommended,
    startMixed,
    startQuickFive,
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
    onStartLawFullCatalogTraining,
    onStartLawLpacapTitleTraining,
    onStartTopicTraining: startTopicSession,
    onStartStudyQuickFive,
    onStartStudySimulacro,
    onStartStudyAllTest,
    onStartStudyCommonTest,
    onStartStudySpecificTest,
    studyCommonQuestionCount: studyTopicScopeCounts.common,
    studySpecificQuestionCount: studyTopicScopeCounts.specific,
    pauseActiveSession,
    resumeActiveSession,
    setActiveTab,
    textHighlightingEnabled,
    setTextHighlightingEnabled,
    openLearningContextPicker,
    closeLearningContextPicker,
    isLearningContextPickerOpen,
    activeLearningContext: activeLearningContext.data,
    activeLearningContextLoading: activeLearningContext.loading,
    activeLearningContextError: activeLearningContext.error,
    refreshActiveLearningContext: activeLearningContext.refresh,
    learningContextOptions: learningContextSelector.contexts,
    learningContextOptionsLoading: learningContextSelector.loading,
    learningContextOptionsError: learningContextSelector.error,
    learningContextSaving: learningContextSelector.saving,
    selectLearningContext: handleSelectLearningContext,
    refreshLearningContextOptions: learningContextSelector.refresh,
  };
};
