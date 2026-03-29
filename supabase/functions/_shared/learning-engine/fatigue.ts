import { clamp } from './math.ts';
import { ErrorType } from './types.ts';

export interface SessionAttemptInsight {
  isCorrect: boolean;
  responseTimeMs: number | null;
  errorTypeInferred?: ErrorType | null;
  changedAnswer?: boolean;
}

const average = (values: number[]) =>
  values.length === 0 ? null : values.reduce((total, value) => total + value, 0) / values.length;

export const computeSessionFatigueScore = (attempts: SessionAttemptInsight[]) => {
  if (attempts.length < 6) return 0;

  const splitIndex = Math.ceil(attempts.length / 2);
  const firstHalf = attempts.slice(0, splitIndex);
  const secondHalf = attempts.slice(splitIndex);

  if (secondHalf.length === 0) return 0;

  const firstAccuracy =
    firstHalf.filter((attempt) => attempt.isCorrect).length / Math.max(firstHalf.length, 1);
  const secondAccuracy =
    secondHalf.filter((attempt) => attempt.isCorrect).length / Math.max(secondHalf.length, 1);
  const firstAvgMs = average(
    firstHalf
      .map((attempt) => attempt.responseTimeMs)
      .filter((value): value is number => value !== null)
  );
  const secondAvgMs = average(
    secondHalf
      .map((attempt) => attempt.responseTimeMs)
      .filter((value): value is number => value !== null)
  );

  const accuracyDrop = Math.max(0, firstAccuracy - secondAccuracy);
  const latencyRise =
    firstAvgMs && secondAvgMs
      ? Math.max(0, (secondAvgMs - firstAvgMs) / Math.max(firstAvgMs, 1))
      : 0;

  return clamp(0, 1, accuracyDrop * 0.6 + Math.min(1, latencyRise) * 0.4);
};

export const computeOverconfidenceScore = (attempts: SessionAttemptInsight[]) => {
  if (attempts.length === 0) return 0;

  const fastWrong = attempts.filter(
    (attempt) =>
      !attempt.isCorrect &&
      attempt.responseTimeMs !== null &&
      attempt.responseTimeMs <= 2500
  ).length;
  const changedToWrong = attempts.filter(
    (attempt) => !attempt.isCorrect && Boolean(attempt.changedAnswer)
  ).length;

  return clamp(0, 1, (fastWrong + changedToWrong) / attempts.length);
};

