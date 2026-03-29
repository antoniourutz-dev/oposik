import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  ActivePracticeSession,
  PracticeAnswer,
  PracticeAnswerSubmission,
  PracticeQuestion,
  PracticeQuestionScopeFilter
} from '../practiceTypes';
import { DEFAULT_CURRICULUM } from '../practiceConfig';
import { recordPracticeSessionInCloud } from '../services/practiceCloudApi';
import type { PracticeView } from './usePracticeSessionFlow';

type UsePracticeSessionLifecycleOptions = {
  isGuest: boolean;
  selectedQuestionScope: PracticeQuestionScopeFilter;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  syncPracticeAfterSession: (questionScope: PracticeQuestionScopeFilter) => Promise<void>;
};

const buildPracticeAnswer = (
  question: PracticeQuestion,
  submission: PracticeAnswerSubmission
): PracticeAnswer => ({
  question,
  selectedOption: submission.selectedOption,
  isCorrect: submission.selectedOption === question.correctOption,
  answeredAt: submission.answeredAt,
  responseTimeMs: submission.responseTimeMs,
  timeToFirstSelectionMs: submission.timeToFirstSelectionMs,
  changedAnswer: submission.changedAnswer,
  errorTypeInferred: submission.errorTypeInferred ?? null
});

export const usePracticeSessionLifecycle = ({
  isGuest,
  selectedQuestionScope,
  setSyncError,
  syncPracticeAfterSession
}: UsePracticeSessionLifecycleOptions) => {
  const [view, setView] = useState<PracticeView>('home');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PracticeAnswer[]>([]);
  const [activeSession, setActiveSession] = useState<ActivePracticeSession | null>(null);

  const currentQuestion = activeSession?.questions[currentQuestionIndex] ?? null;

  const resetActiveSession = useCallback(() => {
    setView('home');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setActiveSession(null);
  }, []);

  const startSession = useCallback((nextSession: ActivePracticeSession | null) => {
    if (!nextSession || nextSession.questions.length === 0) return;
    setActiveSession(nextSession);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setView('quiz');
  }, []);

  const persistSession = useCallback(
    async (completedAnswers: PracticeAnswer[]) => {
      if (!activeSession || isGuest) return;

      try {
        await recordPracticeSessionInCloud(activeSession, completedAnswers, DEFAULT_CURRICULUM);
        await syncPracticeAfterSession(selectedQuestionScope);
      } catch (error) {
        setSyncError(
          error instanceof Error ? error.message : 'No se ha podido guardar el progreso.'
        );
      }
    },
    [activeSession, isGuest, selectedQuestionScope, setSyncError, syncPracticeAfterSession]
  );

  const commitSession = useCallback(
    (completedAnswers: PracticeAnswer[]) => {
      setAnswers(completedAnswers);
      setView('review');
      void persistSession(completedAnswers);
    },
    [persistSession]
  );

  const handleAnswer = useCallback(
    (submission: PracticeAnswerSubmission) => {
      if (!currentQuestion) return;

      const nextAnswer = buildPracticeAnswer(currentQuestion, submission);
      const completedAnswers = [...answers, nextAnswer];

      if (activeSession && currentQuestionIndex === activeSession.questions.length - 1) {
        commitSession(completedAnswers);
        return;
      }

      setAnswers(completedAnswers);
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    },
    [activeSession, answers, commitSession, currentQuestion, currentQuestionIndex]
  );

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
    [answers, commitSession, currentQuestion, resetActiveSession]
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
    [activeSession, answers, commitSession, currentQuestion, handleEndSessionEarly]
  );

  return {
    activeSession,
    answers,
    currentQuestion,
    currentQuestionIndex,
    handleAnswer,
    handleEndSessionEarly,
    handleRetrySession,
    handleSimulacroTimeExpired,
    resetActiveSession,
    startSession,
    view
  };
};
