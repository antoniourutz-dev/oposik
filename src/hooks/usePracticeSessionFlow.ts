import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PracticeQuestionScopeFilter, WeakQuestionInsight } from '../practiceTypes';
import { resolveReviewContinuation } from './practiceSessionFlowDecisions';
import { usePracticeSessionLifecycle } from './usePracticeSessionLifecycle';
import { usePracticeSessionStarters } from './usePracticeSessionStarters';

export type PracticeView = 'home' | 'quiz' | 'review';

type UsePracticeSessionFlowOptions = {
  guestBlocksRemaining: number;
  guestBlocksUsed: number;
  isGuest: boolean;
  onGuestBlockConsumed: (nextBlockNumber: number) => void;
  questionsCount: number;
  recommendedBatchStartIndex: number;
  selectedQuestionScope: PracticeQuestionScopeFilter;
  setLoadingQuestions: Dispatch<SetStateAction<boolean>>;
  setQuestionsError: Dispatch<SetStateAction<string | null>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  syncPracticeAfterSession: (questionScope: PracticeQuestionScopeFilter) => Promise<void>;
  weakQuestions: WeakQuestionInsight[];
};

export const usePracticeSessionFlow = ({
  guestBlocksRemaining,
  guestBlocksUsed,
  isGuest,
  onGuestBlockConsumed,
  questionsCount,
  recommendedBatchStartIndex,
  selectedQuestionScope,
  setLoadingQuestions,
  setQuestionsError,
  setSyncError,
  syncPracticeAfterSession,
  weakQuestions,
}: UsePracticeSessionFlowOptions) => {
  const {
    activeSession,
    answers,
    currentQuestion,
    currentQuestionIndex,
    handleAnswer,
    handleEndSessionEarly,
    handleRetrySession,
    handleSimulacroTimeExpired,
    pauseActiveSession,
    resumeActiveSession,
    resetActiveSession,
    startSession,
    view,
  } = usePracticeSessionLifecycle({
    isGuest,
    selectedQuestionScope,
    setSyncError,
    syncPracticeAfterSession,
  });

  const {
    startAntiTrap,
    startFromBeginning,
    startGenericRecommended,
    startGuest,
    startGuestSession,
    startMixed,
    startRandom,
    startSimulacro,
    startWeakReview,
    startStandardSession,
    startLawSession,
  } = usePracticeSessionStarters({
    guestBlocksRemaining,
    guestBlocksUsed,
    onGuestBlockConsumed,
    questionsCount,
    recommendedBatchStartIndex,
    selectedQuestionScope,
    setLoadingQuestions,
    setQuestionsError,
    startSession,
    weakQuestions,
  });

  const handleContinueAfterReview = useCallback(() => {
    const decision = resolveReviewContinuation({
      activeSession,
      guestBlocksRemaining,
      isGuest,
      selectedQuestionScope,
    });

    switch (decision.type) {
      case 'guest_next':
        void startGuestSession();
        return;
      case 'standard_next':
        void startStandardSession(decision.batchStartIndex, decision.questionScope);
        return;
      default:
        resetActiveSession();
        return;
    }
  }, [
    activeSession,
    guestBlocksRemaining,
    isGuest,
    resetActiveSession,
    selectedQuestionScope,
    startGuestSession,
    startStandardSession,
  ]);

  return {
    activeSession,
    answers,
    currentQuestion,
    currentQuestionIndex,
    goHome: resetActiveSession,
    handleAnswer,
    handleContinueAfterReview,
    handleEndSessionEarly,
    handleRetrySession,
    handleSimulacroTimeExpired,
    pauseActiveSession,
    resumeActiveSession,
    resetActiveSession,
    startAntiTrap,
    startFromBeginning,
    startGenericRecommended,
    startGuest,
    startLawSession,
    startMixed,
    startRandom,
    startSimulacro,
    startStandardSession,
    startWeakReview,
    view,
  };
};
