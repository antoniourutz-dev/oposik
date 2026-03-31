import { MasteryLevel } from './types';

export const computeDifficultyFactor = (globalDifficulty: number | null | undefined) => {
  if (globalDifficulty === null || globalDifficulty === undefined) return 1;
  const normalized = Math.min(1, Math.max(0, globalDifficulty));
  return 1.05 - normalized * 0.3;
};

export const computeExamFactor = (daysToExam: number | null) => {
  if (daysToExam === null) return 1;
  if (daysToExam > 120) return 1;
  if (daysToExam > 60) return 0.9;
  if (daysToExam > 30) return 0.8;
  return 0.65;
};

export const computeNextIntervalDays = ({
  isCorrect,
  masteryLevel,
  difficultyFactor,
  latencyFactor,
  examFactor,
}: {
  isCorrect: boolean;
  masteryLevel: MasteryLevel;
  difficultyFactor: number;
  latencyFactor: number;
  examFactor: number;
}) => {
  if (!isCorrect) return 1;

  const baseIntervals: Record<MasteryLevel, number> = {
    0: 1,
    1: 3,
    2: 7,
    3: 14,
    4: 21,
  };

  return Math.max(
    1,
    Math.round(baseIntervals[masteryLevel] * difficultyFactor * latencyFactor * examFactor),
  );
};

export const computeReviewsNeededBeforeExam = ({
  daysToExam,
  intervalDays,
}: {
  daysToExam: number | null;
  intervalDays: number;
}) => {
  if (daysToExam === null || daysToExam <= 0) return 0;
  return Math.max(0, Math.ceil(daysToExam / Math.max(intervalDays, 1)) - 1);
};
