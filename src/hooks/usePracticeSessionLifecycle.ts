import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  ActivePracticeSession,
  PracticeAnswer,
  PracticeAnswerSubmission,
  PracticeQuestion,
  PracticeQuestionScopeFilter,
} from '../practiceTypes';
import { DEFAULT_CURRICULUM } from '../practiceConfig';
import { recordPracticeSessionInCloud } from '../services/practiceCloudApi';
import type { PracticeView } from './usePracticeSessionFlow';

const ACTIVE_SESSION_STORAGE_KEY = 'quantia_active_session_v1';
const ACTIVE_SESSION_STORAGE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

type StoredActiveSession = {
  activeSession: ActivePracticeSession;
  answers: PracticeAnswer[];
  currentQuestionIndex: number;
  view: Exclude<PracticeView, 'home'>;
  updatedAt: string;
};

const readStoredActiveSession = (): StoredActiveSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      window.sessionStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) ??
      window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredActiveSession;
    if (!parsed?.activeSession?.questions?.length) return null;
    if (parsed.currentQuestionIndex < 0) return null;
    if (parsed.currentQuestionIndex >= parsed.activeSession.questions.length) return null;
    if (parsed.view !== 'quiz' && parsed.view !== 'review') return null;
    const updatedAtMs = Date.parse(parsed.updatedAt);
    if (!Number.isFinite(updatedAtMs)) return null;
    if (Date.now() - updatedAtMs > ACTIVE_SESSION_STORAGE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const clearStoredActiveSession = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
};

const writeStoredActiveSession = (value: StoredActiveSession) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // algunos navegadores purgan sessionStorage al “discard”; fallback a localStorage.
    try {
      window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(value));
    } catch {
      // ignore
    }
  }
};

const buildStoredActiveSession = (
  activeSession: ActivePracticeSession,
  answers: PracticeAnswer[],
  currentQuestionIndex: number,
  view: Exclude<PracticeView, 'home'>,
): StoredActiveSession => ({
  activeSession,
  answers,
  currentQuestionIndex,
  view,
  updatedAt: new Date().toISOString(),
});

type UsePracticeSessionLifecycleOptions = {
  isGuest: boolean;
  selectedQuestionScope: PracticeQuestionScopeFilter;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  syncPracticeAfterSession: (questionScope: PracticeQuestionScopeFilter) => Promise<void>;
};

const buildPracticeAnswer = (
  question: PracticeQuestion,
  submission: PracticeAnswerSubmission,
): PracticeAnswer => ({
  question,
  selectedOption: submission.selectedOption,
  isCorrect: submission.selectedOption === question.correctOption,
  answeredAt: submission.answeredAt,
  responseTimeMs: submission.responseTimeMs,
  timeToFirstSelectionMs: submission.timeToFirstSelectionMs,
  changedAnswer: submission.changedAnswer,
  errorTypeInferred: submission.errorTypeInferred ?? null,
});

export const usePracticeSessionLifecycle = ({
  isGuest,
  selectedQuestionScope,
  setSyncError,
  syncPracticeAfterSession,
}: UsePracticeSessionLifecycleOptions) => {
  const restored = useMemo(() => (isGuest ? null : readStoredActiveSession()), [isGuest]);
  const [view, setView] = useState<PracticeView>(restored?.view ?? 'home');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    restored?.currentQuestionIndex ?? 0,
  );
  const [answers, setAnswers] = useState<PracticeAnswer[]>(restored?.answers ?? []);
  const [activeSession, setActiveSession] = useState<ActivePracticeSession | null>(
    restored?.activeSession ?? null,
  );

  const currentQuestion = activeSession?.questions[currentQuestionIndex] ?? null;

  const resetActiveSession = useCallback(() => {
    setView('home');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setActiveSession(null);
    clearStoredActiveSession();
  }, []);

  const pauseActiveSession = useCallback(() => {
    setView('home');
  }, []);

  const resumeActiveSession = useCallback(() => {
    if (!activeSession) return;
    if (activeSession.mode === 'catalog_review') {
      setView('catalog_review');
      return;
    }
    if (answers.length >= activeSession.questions.length && answers.length > 0) {
      setView('review');
      return;
    }
    setView('quiz');
  }, [activeSession, answers.length]);

  const startSession = useCallback((nextSession: ActivePracticeSession | null) => {
    if (!nextSession || nextSession.questions.length === 0) return;
    setActiveSession(nextSession);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    const nextView: PracticeView =
      nextSession.mode === 'catalog_review' ? 'catalog_review' : 'quiz';
    setView(nextView);
    clearStoredActiveSession();
    if (nextView === 'quiz') {
      writeStoredActiveSession(buildStoredActiveSession(nextSession, [], 0, 'quiz'));
    }
  }, []);

  const handleCatalogReviewNext = useCallback(() => {
    if (!activeSession || activeSession.mode !== 'catalog_review') return;
    if (currentQuestionIndex >= activeSession.questions.length - 1) {
      resetActiveSession();
      return;
    }
    setCurrentQuestionIndex((i) => i + 1);
  }, [activeSession, currentQuestionIndex, resetActiveSession]);

  const persistSession = useCallback(
    async (completedAnswers: PracticeAnswer[]) => {
      if (!activeSession || isGuest) return;

      try {
        await recordPracticeSessionInCloud(activeSession, completedAnswers, DEFAULT_CURRICULUM);
        await syncPracticeAfterSession(selectedQuestionScope);
      } catch (error) {
        setSyncError(
          error instanceof Error ? error.message : 'No se ha podido guardar el progreso.',
        );
      }
    },
    [activeSession, isGuest, selectedQuestionScope, setSyncError, syncPracticeAfterSession],
  );

  const commitSession = useCallback(
    (completedAnswers: PracticeAnswer[]) => {
      setAnswers(completedAnswers);
      setView('review');
      if (activeSession && !isGuest) {
        writeStoredActiveSession(
          buildStoredActiveSession(activeSession, completedAnswers, currentQuestionIndex, 'review'),
        );
      }
      void persistSession(completedAnswers);
    },
    [activeSession, currentQuestionIndex, isGuest, persistSession],
  );

  const handleAnswer = useCallback(
    (submission: PracticeAnswerSubmission) => {
      if (!currentQuestion) return;
      if (activeSession?.mode === 'catalog_review') return;

      const nextAnswer = buildPracticeAnswer(currentQuestion, submission);
      const completedAnswers = [...answers, nextAnswer];

      if (activeSession && currentQuestionIndex === activeSession.questions.length - 1) {
        commitSession(completedAnswers);
        return;
      }

      if (activeSession && !isGuest) {
        writeStoredActiveSession(
          buildStoredActiveSession(activeSession, completedAnswers, currentQuestionIndex + 1, 'quiz'),
        );
      }
      setAnswers(completedAnswers);
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    },
    [activeSession, answers, commitSession, currentQuestion, currentQuestionIndex, isGuest],
  );

  useEffect(() => {
    if (isGuest) return;
    if (!activeSession) {
      clearStoredActiveSession();
      return;
    }
    if (view !== 'quiz' && view !== 'review') return;

    writeStoredActiveSession({
      activeSession,
      answers,
      currentQuestionIndex,
      view,
      updatedAt: new Date().toISOString(),
    });
  }, [activeSession, answers, currentQuestionIndex, isGuest, view]);

  const handleRetrySession = useCallback(() => {
    if (isGuest || !activeSession) return;
    void (async () => {
      const { restartPracticeSession } = await import('../services/practiceSessionFactory');
      startSession(restartPracticeSession(activeSession));
    })();
  }, [activeSession, isGuest, startSession]);

  const handleEndSessionEarly = useCallback(
    (submission: PracticeAnswerSubmission | null = null) => {
      if (submission && currentQuestion) {
        const nextAnswer = buildPracticeAnswer(currentQuestion, submission);
        commitSession([...answers, nextAnswer]);
        return;
      }

      if (answers.length === 0) {
        resetActiveSession();
        return;
      }

      commitSession(answers);
    },
    [answers, commitSession, currentQuestion, resetActiveSession],
  );

  const handleSimulacroTimeExpired = useCallback(
    (submission: PracticeAnswerSubmission | null) => {
      if (!activeSession || activeSession.mode !== 'simulacro') {
        handleEndSessionEarly(submission);
        return;
      }

      if (!currentQuestion || !submission) {
        commitSession(answers);
        return;
      }

      const nextAnswer = buildPracticeAnswer(currentQuestion, submission);
      commitSession([...answers, nextAnswer]);
    },
    [activeSession, answers, commitSession, currentQuestion, handleEndSessionEarly],
  );

  return {
    activeSession,
    answers,
    currentQuestion,
    currentQuestionIndex,
    handleAnswer,
    handleCatalogReviewNext,
    handleEndSessionEarly,
    handleRetrySession,
    handleSimulacroTimeExpired,
    pauseActiveSession,
    resumeActiveSession,
    resetActiveSession,
    startSession,
    view,
  };
};
