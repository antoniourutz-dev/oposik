import { addDays, daysBetween, toDayKey } from './math.ts';
import { computeErrorPenalty, resolveDominantErrorType } from './errorInference.ts';
import {
  computeBaseProbability,
  computeEstimatedProbability,
  computeLatencyFactor,
  computeRecentProbability,
  scoreRecentAttempt
} from './probability.ts';
import { projectExamRetentionProbability } from './readiness.ts';
import {
  computeDifficultyFactor,
  computeExamFactor,
  computeNextIntervalDays,
  computeReviewsNeededBeforeExam
} from './scheduler.ts';
import {
  computeMasteryLevel,
  updateStabilityScore
} from './stability.ts';
import {
  AttemptInput,
  QuestionStateTransition,
  RecentPerformanceScore,
  UserQuestionState
} from './types.ts';

const updateRollingAverage = (
  previousAverage: number | null,
  previousCount: number,
  nextValue: number | null
) => {
  if (nextValue === null) return previousAverage;
  if (previousAverage === null || previousCount <= 0) return Math.round(nextValue);

  return Math.round((previousAverage * previousCount + nextValue) / (previousCount + 1));
};

const updateMedianApproximation = (
  previousMedian: number | null,
  nextValue: number | null
) => {
  if (nextValue === null) return previousMedian;
  if (previousMedian === null) return Math.round(nextValue);
  return Math.round((previousMedian + nextValue) / 2);
};

export const updateQuestionState = ({
  previousState,
  attempt,
  recentScores = [],
  examDate = null
}: {
  previousState: UserQuestionState | null;
  attempt: AttemptInput;
  recentScores?: RecentPerformanceScore[];
  examDate?: Date | null;
}): QuestionStateTransition => {
  const now = new Date(attempt.answeredAt);
  const attemptsBefore = previousState?.attempts ?? 0;
  const attempts = attemptsBefore + 1;
  const correctAttempts = (previousState?.correctAttempts ?? 0) + (attempt.isCorrect ? 1 : 0);
  const incorrectAttempts =
    (previousState?.incorrectAttempts ?? 0) + (attempt.isCorrect ? 0 : 1);
  const consecutiveCorrect = attempt.isCorrect ? (previousState?.consecutiveCorrect ?? 0) + 1 : 0;
  const consecutiveIncorrect = attempt.isCorrect
    ? 0
    : (previousState?.consecutiveIncorrect ?? 0) + 1;
  const distinctSuccessfulDays =
    attempt.isCorrect &&
    (!previousState?.lastCorrectAt ||
      toDayKey(previousState.lastCorrectAt) !== toDayKey(now))
      ? (previousState?.distinctSuccessfulDays ?? 0) + 1
      : previousState?.distinctSuccessfulDays ?? 0;

  const baseProbability = computeBaseProbability(attempts, correctAttempts);
  const latencyFactor = computeLatencyFactor(
    attempt.responseTimeMs,
    attempt.referenceTimeMs ?? 15000
  );
  const recentProbability = computeRecentProbability([
    scoreRecentAttempt({ isCorrect: attempt.isCorrect, latencyFactor }),
    ...recentScores
  ]);
  const errorPenalty = computeErrorPenalty(attempt.errorTypeInferred);
  const pCorrectEstimated = computeEstimatedProbability({
    baseProbability,
    recentProbability,
    latencyFactor,
    errorPenalty
  });
  const difficultyFactor = computeDifficultyFactor(attempt.globalDifficulty);
  const lapseCount =
    !attempt.isCorrect && (previousState?.masteryLevel ?? 0) >= 3
      ? (previousState?.lapseCount ?? 0) + 1
      : previousState?.lapseCount ?? 0;
  const masteryLevel = computeMasteryLevel({
    attempts,
    pEstimated: pCorrectEstimated,
    consecutiveCorrect,
    distinctSuccessfulDays,
    lapseCount
  });
  const stabilityScore = updateStabilityScore({
    oldStability: previousState?.stabilityScore ?? 1,
    isCorrect: attempt.isCorrect,
    latencyFactor,
    difficultyFactor
  });
  const daysToExam = examDate ? daysBetween(now, examDate) : null;
  const examFactor = computeExamFactor(daysToExam);
  const intervalDays = computeNextIntervalDays({
    isCorrect: attempt.isCorrect,
    masteryLevel,
    difficultyFactor,
    latencyFactor,
    examFactor
  });
  const nextReviewAt = addDays(now, intervalDays).toISOString();
  const examRetentionProbability = projectExamRetentionProbability({
    pEstimated: pCorrectEstimated,
    stabilityScore,
    fromDate: now,
    examDate
  });

  return {
    previousState,
    nextState: {
      userId: attempt.userId,
      questionId: attempt.questionId,
      curriculum: attempt.curriculum,
      questionNumber: attempt.questionNumber,
      statement: attempt.statement,
      category: attempt.category,
      explanation: attempt.explanation,
      attempts,
      correctAttempts,
      incorrectAttempts,
      consecutiveCorrect,
      consecutiveIncorrect,
      distinctSuccessfulDays,
      lastResult: attempt.isCorrect ? 'correct' : 'incorrect',
      lastSelectedOption: attempt.selectedOption,
      lastSeenAt: now.toISOString(),
      lastCorrectAt: attempt.isCorrect
        ? now.toISOString()
        : previousState?.lastCorrectAt ?? null,
      nextReviewAt,
      masteryLevel,
      stabilityScore,
      retrievabilityScore: pCorrectEstimated,
      pCorrectEstimated,
      avgResponseTimeMs: updateRollingAverage(
        previousState?.avgResponseTimeMs ?? null,
        attemptsBefore,
        attempt.responseTimeMs
      ),
      medianResponseTimeMs: updateMedianApproximation(
        previousState?.medianResponseTimeMs ?? null,
        attempt.responseTimeMs
      ),
      lastResponseTimeMs: attempt.responseTimeMs,
      fastCorrectCount:
        (previousState?.fastCorrectCount ?? 0) +
        (attempt.isCorrect && latencyFactor >= 1 ? 1 : 0),
      slowCorrectCount:
        (previousState?.slowCorrectCount ?? 0) +
        (attempt.isCorrect && latencyFactor < 1 ? 1 : 0),
      lapseCount,
      examRetentionProbability,
      reviewsNeededBeforeExam: computeReviewsNeededBeforeExam({
        daysToExam,
        intervalDays
      }),
      dominantErrorType: resolveDominantErrorType({
        previousDominantErrorType: previousState?.dominantErrorType ?? null,
        currentErrorType: attempt.errorTypeInferred,
        isCorrect: attempt.isCorrect
      }),
      timesExplanationOpened: previousState?.timesExplanationOpened ?? 0,
      timesChangedAnswer:
        (previousState?.timesChangedAnswer ?? 0) + (attempt.changedAnswer ? 1 : 0)
    },
    latencyFactor,
    errorPenalty,
    difficultyFactor,
    examFactor,
    intervalDays
  };
};
