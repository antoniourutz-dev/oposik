import { clamp } from './math';
import { MasteryLevel } from './types';

export const computeMasteryLevel = ({
  attempts,
  pEstimated,
  consecutiveCorrect,
  distinctSuccessfulDays,
  lapseCount
}: {
  attempts: number;
  pEstimated: number;
  consecutiveCorrect: number;
  distinctSuccessfulDays: number;
  lapseCount: number;
}): MasteryLevel => {
  if (attempts === 0) return 0;
  if (
    pEstimated >= 0.85 &&
    consecutiveCorrect >= 4 &&
    distinctSuccessfulDays >= 2 &&
    lapseCount === 0
  ) {
    return 4;
  }
  if (pEstimated >= 0.78 && consecutiveCorrect >= 3) return 3;
  if (pEstimated >= 0.65 && consecutiveCorrect >= 2) return 2;
  return 1;
};

export const updateStabilityScore = ({
  oldStability,
  isCorrect,
  latencyFactor,
  difficultyFactor
}: {
  oldStability: number;
  isCorrect: boolean;
  latencyFactor: number;
  difficultyFactor: number;
}) => {
  if (!isCorrect) return Math.max(1, oldStability * 0.45);

  const baseMultiplier = latencyFactor >= 1 ? 1.8 : 1.45;
  const difficultyAdjustment = difficultyFactor < 1 ? 0.95 : 1;
  return Math.max(1, oldStability * baseMultiplier * difficultyAdjustment);
};

export const computeRetrievabilityScore = ({
  stabilityScore,
  elapsedDays
}: {
  stabilityScore: number;
  elapsedDays: number;
}) => {
  if (elapsedDays <= 0) return 1;
  return clamp(0, 1, Math.exp(-elapsedDays / Math.max(stabilityScore, 1)));
};
