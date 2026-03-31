import { clamp } from './math';
import { RecentPerformanceScore } from './types';

export const computeBaseProbability = (attempts: number, correctAttempts: number) => {
  if (attempts <= 0) return 0.25;
  return clamp(0.25, 0.95, (correctAttempts + 1) / (attempts + 2));
};

export const computeRecentProbability = (scores: RecentPerformanceScore[]) => {
  if (scores.length === 0) return 0.25;

  const weights = [0.5, 0.3, 0.2];
  const weightedSum = scores.slice(0, 3).reduce<number>((total, score, index) => {
    return total + score * weights[index];
  }, 0);
  const totalWeight = weights.slice(0, Math.min(scores.length, 3)).reduce((a, b) => a + b, 0);

  return clamp(0.25, 1, weightedSum / totalWeight);
};

export const computeLatencyFactor = (responseTimeMs: number | null, referenceTimeMs = 15000) => {
  if (!responseTimeMs || responseTimeMs <= 0) return 1;
  return clamp(0.7, 1.05, referenceTimeMs / responseTimeMs);
};

export const scoreRecentAttempt = ({
  isCorrect,
  latencyFactor,
}: {
  isCorrect: boolean;
  latencyFactor: number;
}): RecentPerformanceScore => {
  if (isCorrect) {
    return latencyFactor >= 1 ? 1 : 0.8;
  }

  return latencyFactor >= 1 ? 0.2 : 0;
};

export const computeEstimatedProbability = ({
  baseProbability,
  recentProbability,
  latencyFactor,
  errorPenalty,
}: {
  baseProbability: number;
  recentProbability: number;
  latencyFactor: number;
  errorPenalty: number;
}) => {
  const latencyProbability = baseProbability * latencyFactor;
  const errorAdjustedProbability = Math.max(0.25, baseProbability - errorPenalty);

  const estimated =
    0.4 * baseProbability +
    0.3 * recentProbability +
    0.2 * latencyProbability +
    0.1 * errorAdjustedProbability;

  return clamp(0.25, 0.95, estimated);
};
