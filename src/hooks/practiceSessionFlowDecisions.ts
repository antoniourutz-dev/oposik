import type { ActivePracticeSession, PracticeQuestionScopeFilter } from '../practiceTypes';

export type ReviewContinuationDecision =
  | { type: 'reset' }
  | {
      type: 'guest_next';
    }
  | {
      type: 'standard_next';
      batchStartIndex: number;
      questionScope: PracticeQuestionScopeFilter;
    };

export const resolveReviewContinuation = ({
  activeSession,
  guestBlocksRemaining,
  isGuest,
  selectedQuestionScope,
}: {
  activeSession: ActivePracticeSession | null;
  guestBlocksRemaining: number;
  isGuest: boolean;
  selectedQuestionScope: PracticeQuestionScopeFilter;
}): ReviewContinuationDecision => {
  if (!activeSession) {
    return { type: 'reset' };
  }

  if (isGuest) {
    if (guestBlocksRemaining > 0) {
      return { type: 'guest_next' };
    }

    return { type: 'reset' };
  }

  if (activeSession.mode === 'standard' && activeSession.nextStandardBatchStartIndex) {
    return {
      type: 'standard_next',
      batchStartIndex: activeSession.nextStandardBatchStartIndex,
      questionScope: activeSession.questionScope ?? selectedQuestionScope,
    };
  }

  return { type: 'reset' };
};
