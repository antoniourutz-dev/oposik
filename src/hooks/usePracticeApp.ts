import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  ActivePracticeSession,
  CloudPracticeState,
  OptionKey,
  PracticeAnswer,
  PracticeAnswerSubmission,
  WeakQuestionInsight
} from '../practiceTypes';
import type { AccountIdentity } from '../services/accountApi';
import type { MainTab } from '../components/BottomDock';
import { buildPracticeCoachPlan } from '../domain/learningEngine';
import {
  getAntiTrapPracticeBatch,
  getGuestPracticeBatch,
  getMixedPracticeBatch,
  getRandomPracticeBatch,
  getSimulacroPracticeBatch,
  getStandardPracticeBatch
} from '../services/preguntasApi';
import {
  recordPracticeSessionInCloud,
  upsertMyExamTarget
} from '../services/practiceCloudApi';
import {
  createEmptyPracticeState,
  loadPracticeBootstrap,
  refreshPracticeAfterSession
} from '../services/practiceBootstrapApi';
import {
  buildAntiTrapPracticeSession,
  buildGuestPracticeSession,
  buildMixedPracticeSession,
  buildRandomPracticeSession,
  buildSimulacroPracticeSession,
  buildStandardPracticeSession,
  buildWeakestPracticeSession,
  restartPracticeSession
} from '../services/practiceSessionFactory';
import {
  DEFAULT_CURRICULUM,
  PRACTICE_BATCH_SIZE,
  SIMULACRO_BATCH_SIZE
} from '../practiceConfig';
import {
  clearSupabaseAuthStorage,
  getSafeSupabaseSession,
  supabase
} from '../supabaseClient';
import { getWeakCategories } from '../utils/practiceStats';

export type PracticeView = 'home' | 'quiz' | 'review';

const GUEST_MAX_BLOCKS = 2;
const GUEST_ACCESS_STORAGE_KEY = 'oposik_guest_preview_v1';
const GUEST_IDENTITY: AccountIdentity = {
  user_id: 'guest-preview',
  current_username: 'Invitado',
  is_admin: false,
  previous_usernames: []
};

const clampGuestBlocksUsed = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(GUEST_MAX_BLOCKS, Math.max(0, Math.trunc(numeric)));
};

const readGuestBlocksUsed = () => {
  if (typeof window === 'undefined') return 0;

  try {
    const rawValue = window.localStorage.getItem(GUEST_ACCESS_STORAGE_KEY);
    if (!rawValue) return 0;

    const parsed = JSON.parse(rawValue) as number | { usedBlocks?: number };
    return clampGuestBlocksUsed(
      typeof parsed === 'number' ? parsed : parsed?.usedBlocks
    );
  } catch {
    return 0;
  }
};

const persistGuestBlocksUsed = (usedBlocks: number) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    GUEST_ACCESS_STORAGE_KEY,
    JSON.stringify({
      usedBlocks: clampGuestBlocksUsed(usedBlocks),
      updatedAt: new Date().toISOString()
    })
  );
};

export const usePracticeApp = () => {
  const [questionsCount, setQuestionsCount] = useState(0);
  const [weakQuestions, setWeakQuestions] = useState<WeakQuestionInsight[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [identity, setIdentity] = useState<AccountIdentity | null>(null);
  const [practiceState, setPracticeState] = useState<CloudPracticeState>(
    createEmptyPracticeState
  );
  const [syncingState, setSyncingState] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [view, setView] = useState<PracticeView>('home');
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PracticeAnswer[]>([]);
  const [activeSession, setActiveSession] = useState<ActivePracticeSession | null>(null);
  const [savingExamTarget, setSavingExamTarget] = useState(false);
  const [examTargetError, setExamTargetError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestBlocksUsed, setGuestBlocksUsed] = useState(readGuestBlocksUsed);

  const profile = practiceState.profile;
  const recentSessions = practiceState.recentSessions;
  const questionStats = practiceState.questionStats;
  const learningDashboard = practiceState.learningDashboard;
  const examTarget = practiceState.examTarget;
  const pressureInsights = practiceState.pressureInsights;
  const guestBlocksRemaining = Math.max(0, GUEST_MAX_BLOCKS - guestBlocksUsed);

  const totalBatches = Math.max(1, Math.ceil(questionsCount / PRACTICE_BATCH_SIZE));
  const recommendedBatchStartIndex =
    profile && profile.nextStandardBatchStartIndex < questionsCount
      ? profile.nextStandardBatchStartIndex
      : 0;
  const recommendedBatchNumber =
    Math.floor(recommendedBatchStartIndex / PRACTICE_BATCH_SIZE) + 1;

  const weakCategories = useMemo(() => getWeakCategories(questionStats), [questionStats]);
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

  const currentQuestion = activeSession?.questions[currentQuestionIndex] ?? null;

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

  const resetActiveSession = () => {
    setView('home');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setActiveSession(null);
  };

  const clearAccountContext = () => {
    setIdentity(null);
    setQuestionsCount(0);
    setWeakQuestions([]);
    setPracticeState(createEmptyPracticeState());
    setExamTargetError(null);
  };

  const loadAccountContext = async () => {
    setSyncingState(true);
    setSyncError(null);
    setQuestionsError(null);
    setExamTargetError(null);
    setIsGuest(false);

    try {
      const bootstrap = await loadPracticeBootstrap(DEFAULT_CURRICULUM);
      setIdentity(bootstrap.identity);
      setPracticeState(bootstrap.practiceState);
      setQuestionsCount(bootstrap.questionsCount);
      setWeakQuestions(bootstrap.weakQuestions);
      setSyncError(bootstrap.syncError);
      setQuestionsError(bootstrap.questionsError);
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'No se ha podido sincronizar la cuenta.'
      );
    } finally {
      setSyncingState(false);
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      try {
        const currentSession = await getSafeSupabaseSession();
        if (!active) return;

        setSession(currentSession);

        if (currentSession) {
          setLoadingQuestions(true);
          await loadAccountContext();
        } else {
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
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;

      setSession(nextSession);
      resetActiveSession();

      if (nextSession) {
        setLoadingQuestions(true);
        void loadAccountContext();
      } else {
        clearAccountContext();
        setSyncError(null);
      }

      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const startSession = (nextSession: ActivePracticeSession | null) => {
    if (!nextSession || nextSession.questions.length === 0) return;
    setActiveSession(nextSession);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setView('quiz');
  };

  const buildStandardSession = async (batchStartIndex: number) => {
    const normalizedStartIndex =
      batchStartIndex >= 0 && batchStartIndex < questionsCount ? batchStartIndex : 0;
    const batchQuestions = await getStandardPracticeBatch(
      normalizedStartIndex,
      PRACTICE_BATCH_SIZE,
      DEFAULT_CURRICULUM
    );

    return buildStandardPracticeSession({
      batchStartIndex: normalizedStartIndex,
      questionsCount,
      questions: batchQuestions,
      batchSize: PRACTICE_BATCH_SIZE
    });
  };

  const startStandardSession = async (batchStartIndex: number) => {
    setLoadingQuestions(true);
    setQuestionsError(null);

    try {
      const nextSession = await buildStandardSession(batchStartIndex);
      if (!nextSession) {
        setQuestionsError('No se ha encontrado un bloque de preguntas para esa posicion.');
        return;
      }

      startSession(nextSession);
    } catch (error) {
      setQuestionsError(
        error instanceof Error ? error.message : 'No se han podido cargar las preguntas.'
      );
    } finally {
      setLoadingQuestions(false);
    }
  };

  const startRandomSession = async () => {
    setLoadingQuestions(true);
    setQuestionsError(null);

    try {
      const randomQuestions = await getRandomPracticeBatch(
        PRACTICE_BATCH_SIZE,
        DEFAULT_CURRICULUM
      );
      const nextSession = buildRandomPracticeSession(randomQuestions);
      if (!nextSession) {
        setQuestionsError('No se ha podido construir una sesion aleatoria con el catalogo actual.');
        return;
      }

      startSession(nextSession);
    } catch (error) {
      setQuestionsError(
        error instanceof Error ? error.message : 'No se han podido cargar preguntas aleatorias.'
      );
    } finally {
      setLoadingQuestions(false);
    }
  };

  const startGuestSession = async () => {
    if (guestBlocksRemaining <= 0) {
      setQuestionsError('El acceso invitado ya ha consumido sus dos bloques de prueba.');
      return;
    }

    setLoadingQuestions(true);
    setQuestionsError(null);

    try {
      const nextBlockNumber = guestBlocksUsed + 1;
      const guestQuestions = await getGuestPracticeBatch(
        PRACTICE_BATCH_SIZE,
        DEFAULT_CURRICULUM
      );
      const nextSession = buildGuestPracticeSession({
        questions: guestQuestions,
        blockNumber: nextBlockNumber,
        totalBlocks: GUEST_MAX_BLOCKS
      });

      if (!nextSession) {
        setQuestionsError('No se ha podido preparar el bloque invitado.');
        return;
      }

      setGuestBlocksUsed(nextBlockNumber);
      persistGuestBlocksUsed(nextBlockNumber);
      startSession(nextSession);
    } catch (error) {
      setQuestionsError(
        error instanceof Error
          ? error.message
          : 'No se ha podido cargar el bloque de invitado.'
      );
    } finally {
      setLoadingQuestions(false);
    }
  };

  const startMixedSession = async () => {
    setLoadingQuestions(true);
    setQuestionsError(null);

    try {
      const mixedQuestions = await getMixedPracticeBatch(
        PRACTICE_BATCH_SIZE,
        DEFAULT_CURRICULUM
      );
      const nextSession = buildMixedPracticeSession(mixedQuestions);
      if (!nextSession) {
        setQuestionsError(
          'No se ha podido construir una sesion adaptativa con el estado actual.'
        );
        return;
      }

      startSession(nextSession);
    } catch (error) {
      try {
        const fallbackSession = await buildStandardSession(recommendedBatchStartIndex);
        if (!fallbackSession) {
          throw error;
        }

        startSession(fallbackSession);
      } catch {
        setQuestionsError(
          error instanceof Error ? error.message : 'No se ha podido preparar la sesion del dia.'
        );
      }
    } finally {
      setLoadingQuestions(false);
    }
  };

  const startAntiTrapSession = async () => {
    setLoadingQuestions(true);
    setQuestionsError(null);

    try {
      const antiTrapQuestions = await getAntiTrapPracticeBatch(
        PRACTICE_BATCH_SIZE,
        DEFAULT_CURRICULUM
      );
      const nextSession = buildAntiTrapPracticeSession(antiTrapQuestions);
      if (!nextSession) {
        setQuestionsError(
          'No se ha podido preparar un entrenamiento anti-trampas con el estado actual.'
        );
        return;
      }

      startSession(nextSession);
    } catch (error) {
      const fallbackSession = buildWeakestPracticeSession(weakQuestions);
      if (fallbackSession) {
        startSession(fallbackSession);
      } else {
        setQuestionsError(
          error instanceof Error
            ? error.message
            : 'No se ha podido preparar el entrenamiento anti-trampas.'
        );
      }
    } finally {
      setLoadingQuestions(false);
    }
  };

  const startSimulacroSession = async () => {
    setLoadingQuestions(true);
    setQuestionsError(null);

    try {
      const simulacroQuestions = await getSimulacroPracticeBatch(
        SIMULACRO_BATCH_SIZE,
        DEFAULT_CURRICULUM
      );
      const nextSession = buildSimulacroPracticeSession(simulacroQuestions);
      if (!nextSession) {
        setQuestionsError('No se ha podido preparar el simulacro con el catalogo actual.');
        return;
      }

      startSession(nextSession);
    } catch (error) {
      try {
        const fallbackQuestions = await getRandomPracticeBatch(
          SIMULACRO_BATCH_SIZE,
          DEFAULT_CURRICULUM
        );
        const fallbackSession = buildSimulacroPracticeSession(fallbackQuestions);
        if (!fallbackSession) {
          throw error;
        }

        startSession(fallbackSession);
      } catch {
        setQuestionsError(
          error instanceof Error ? error.message : 'No se ha podido preparar el simulacro.'
        );
      }
    } finally {
      setLoadingQuestions(false);
    }
  };

  const persistSession = async (completedAnswers: PracticeAnswer[]) => {
    if (!activeSession || isGuest) return;

    try {
      await recordPracticeSessionInCloud(activeSession, completedAnswers, DEFAULT_CURRICULUM);
      const nextState = await refreshPracticeAfterSession(DEFAULT_CURRICULUM);
      setPracticeState(nextState.practiceState);
      setWeakQuestions(nextState.weakQuestions);
      setSyncError(null);
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'No se ha podido guardar el progreso.'
      );
    }
  };

  const commitSession = (completedAnswers: PracticeAnswer[]) => {
    setAnswers(completedAnswers);
    setView('review');
    void persistSession(completedAnswers);
  };

  const handleAnswer = (submission: PracticeAnswerSubmission) => {
    if (!currentQuestion) return;

    const nextAnswer: PracticeAnswer = {
      question: currentQuestion,
      selectedOption: submission.selectedOption,
      isCorrect: submission.selectedOption === currentQuestion.correctOption,
      answeredAt: submission.answeredAt,
      responseTimeMs: submission.responseTimeMs,
      timeToFirstSelectionMs: submission.timeToFirstSelectionMs,
      changedAnswer: submission.changedAnswer,
      errorTypeInferred: submission.errorTypeInferred ?? null
    };

    const completedAnswers = [...answers, nextAnswer];

    if (activeSession && currentQuestionIndex === activeSession.questions.length - 1) {
      commitSession(completedAnswers);
      return;
    }

    setAnswers(completedAnswers);
    setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
  };

  const handleRetrySession = () => {
    if (isGuest) return;
    if (!activeSession) return;
    startSession(restartPracticeSession(activeSession));
  };

  const handleEndSessionEarly = () => {
    if (answers.length === 0) {
      resetActiveSession();
      return;
    }

    commitSession(answers);
  };

  const handleSimulacroTimeExpired = (submission: PracticeAnswerSubmission | null) => {
    if (!activeSession || activeSession.mode !== 'simulacro') {
      handleEndSessionEarly();
      return;
    }

    if (!currentQuestion || !submission) {
      commitSession(answers);
      return;
    }

    const nextAnswer: PracticeAnswer = {
      question: currentQuestion,
      selectedOption: submission.selectedOption,
      isCorrect: submission.selectedOption === currentQuestion.correctOption,
      answeredAt: submission.answeredAt,
      responseTimeMs: submission.responseTimeMs,
      timeToFirstSelectionMs: submission.timeToFirstSelectionMs,
      changedAnswer: submission.changedAnswer,
      errorTypeInferred: submission.errorTypeInferred ?? null
    };

    commitSession([...answers, nextAnswer]);
  };

  const handleContinueAfterReview = () => {
    if (!activeSession) {
      resetActiveSession();
      return;
    }

    if (isGuest) {
      if (guestBlocksRemaining > 0) {
        void startGuestSession();
        return;
      }

      resetActiveSession();
      return;
    }

    if (activeSession.mode === 'standard' && activeSession.nextStandardBatchStartIndex) {
      void startStandardSession(activeSession.nextStandardBatchStartIndex);
      return;
    }

    resetActiveSession();
  };

  const handleSignedIn = async () => {
    setIsGuest(false);
    const currentSession = await getSafeSupabaseSession();
    setSession(currentSession);
    setLoadingQuestions(true);
    await loadAccountContext();
  };

  const handleEnterGuest = () => {
    setSession(null);
    clearAccountContext();
    resetActiveSession();
    setIsGuest(true);
    setIdentity(GUEST_IDENTITY);
    setQuestionsError(null);
    setSyncError(null);
    setLoadingQuestions(false);
    setActiveTab('home');
  };

  const handleSignOut = async () => {
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
  };

  const handleSaveExamTarget = async ({
    examDate,
    dailyReviewCapacity,
    dailyNewCapacity
  }: {
    examDate: string | null;
    dailyReviewCapacity: number;
    dailyNewCapacity: number;
  }) => {
    setSavingExamTarget(true);
    setExamTargetError(null);

    try {
      await upsertMyExamTarget({
        curriculum: DEFAULT_CURRICULUM,
        examDate,
        dailyReviewCapacity,
        dailyNewCapacity
      });
      await loadAccountContext();
    } catch (error) {
      setExamTargetError(
        error instanceof Error
          ? error.message
          : 'No se ha podido guardar la configuracion del examen.'
      );
    } finally {
      setSavingExamTarget(false);
    }
  };

  return {
    activeSession,
    activeTab,
    answers,
    authReady,
    currentQuestion,
    currentQuestionIndex,
    examTarget,
    examTargetError,
    goHome: resetActiveSession,
    handleAnswer,
    handleContinueAfterReview,
    handleEndSessionEarly,
    handleRetrySession,
    handleSaveExamTarget,
    handleEnterGuest,
    handleSignedIn,
    handleSignOut,
    handleSimulacroTimeExpired,
    identity,
    isGuest,
    learningDashboard,
    loadingQuestions,
    pressureInsights,
    profile,
    questionsCount,
    questionsError,
    recentSessions,
    reloadPracticeData: loadAccountContext,
    recommendedBatchNumber,
    guestBlocksRemaining,
    guestMaxBlocks: GUEST_MAX_BLOCKS,
    savingExamTarget,
    session,
    coachPlan,
    startSimulacro: () => void startSimulacroSession(),
    startAntiTrap: () => void startAntiTrapSession(),
    startFromBeginning: () => void startStandardSession(0),
    startGuest: () => void startGuestSession(),
    startMixed: () => void startMixedSession(),
    startRandom: () => void startRandomSession(),
    startRecommended: () => {
      switch (coachPlan.mode) {
        case 'mixed':
          void startMixedSession();
          return;
        case 'random':
          void startRandomSession();
          return;
        case 'anti_trap':
          void startAntiTrapSession();
          return;
        case 'simulacro':
          void startSimulacroSession();
          return;
        default:
          void startStandardSession(recommendedBatchStartIndex);
      }
    },
    startWeakReview: () => startSession(buildWeakestPracticeSession(weakQuestions)),
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
