import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  ActivePracticeSession,
  CloudPracticeState,
  OptionKey,
  PracticeAnswer,
  WeakQuestionInsight
} from '../practiceTypes';
import type { AccountIdentity } from '../services/accountApi';
import type { MainTab } from '../components/BottomDock';
import {
  getRandomPracticeBatch,
  getStandardPracticeBatch
} from '../services/preguntasApi';
import { recordPracticeSessionInCloud } from '../services/practiceCloudApi';
import {
  createEmptyPracticeState,
  loadPracticeBootstrap,
  refreshPracticeAfterSession
} from '../services/practiceBootstrapApi';
import {
  buildRandomPracticeSession,
  buildStandardPracticeSession,
  buildWeakestPracticeSession,
  restartPracticeSession
} from '../services/practiceSessionFactory';
import { DEFAULT_CURRICULUM, PRACTICE_BATCH_SIZE } from '../practiceConfig';
import {
  clearSupabaseAuthStorage,
  getSafeSupabaseSession,
  supabase
} from '../supabaseClient';
import { getWeakCategories } from '../utils/practiceStats';

export type PracticeView = 'home' | 'quiz' | 'review';

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

  const profile = practiceState.profile;
  const recentSessions = practiceState.recentSessions;
  const questionStats = practiceState.questionStats;

  const totalBatches = Math.max(1, Math.ceil(questionsCount / PRACTICE_BATCH_SIZE));
  const recommendedBatchStartIndex =
    profile && profile.nextStandardBatchStartIndex < questionsCount
      ? profile.nextStandardBatchStartIndex
      : 0;
  const recommendedBatchNumber =
    Math.floor(recommendedBatchStartIndex / PRACTICE_BATCH_SIZE) + 1;

  const weakCategories = useMemo(() => getWeakCategories(questionStats), [questionStats]);

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
  };

  const loadAccountContext = async () => {
    setSyncingState(true);
    setSyncError(null);
    setQuestionsError(null);

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

  const persistSession = async (completedAnswers: PracticeAnswer[]) => {
    if (!activeSession) return;

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

  const handleAnswer = (selectedOption: OptionKey) => {
    if (!currentQuestion) return;

    const nextAnswer: PracticeAnswer = {
      question: currentQuestion,
      selectedOption,
      isCorrect: selectedOption === currentQuestion.correctOption
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

  const handleContinueAfterReview = () => {
    if (!activeSession) {
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
    const currentSession = await getSafeSupabaseSession();
    setSession(currentSession);
    setLoadingQuestions(true);
    await loadAccountContext();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearSupabaseAuthStorage();
    setSession(null);
    clearAccountContext();
    resetActiveSession();
  };

  return {
    activeSession,
    activeTab,
    answers,
    authReady,
    currentQuestion,
    currentQuestionIndex,
    goHome: resetActiveSession,
    handleAnswer,
    handleContinueAfterReview,
    handleEndSessionEarly,
    handleRetrySession,
    handleSignedIn,
    handleSignOut,
    identity,
    loadingQuestions,
    profile,
    questionsCount,
    questionsError,
    recentSessions,
    reloadPracticeData: loadAccountContext,
    recommendedBatchNumber,
    session,
    startFromBeginning: () => void startStandardSession(0),
    startRandom: () => void startRandomSession(),
    startRecommended: () => void startStandardSession(recommendedBatchStartIndex),
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
