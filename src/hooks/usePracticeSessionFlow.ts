import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PracticeQuestionScopeFilter, WeakQuestionInsight } from '../practiceTypes';
import { resolveReviewContinuation } from './practiceSessionFlowDecisions';
import { usePracticeSessionLifecycle } from './usePracticeSessionLifecycle';
import { usePracticeSessionStarters } from './usePracticeSessionStarters';

export type PracticeView = 'home' | 'quiz' | 'review' | 'catalog_review';

type UsePracticeSessionFlowOptions = {
  guestBlocksRemaining: number;
  guestBlocksUsed: number;
  curriculum: string;
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
  curriculum,
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
    handleCatalogReviewNext,
    handleEndSessionEarly,
    handleRetrySession,
    handleSimulacroTimeExpired,
    pauseActiveSession,
    resumeActiveSession,
    resetActiveSession,
    startSession,
    view,
  } = usePracticeSessionLifecycle({
    curriculum,
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
    startQuickFive,
    startRandom,
    startSimulacro,
    startWeakReview,
    startStandardSession,
    startLawSession,
    startTopicSession,
    startCatalogReview,
  } = usePracticeSessionStarters({
    guestBlocksRemaining,
    guestBlocksUsed,
    curriculum,
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
    curriculum,
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
    startLawSession,
    startTopicSession,
    startMixed,
    startQuickFive,
    startRandom,
    startSimulacro,
    startStandardSession,
    startWeakReview,
    view,
  };
};
