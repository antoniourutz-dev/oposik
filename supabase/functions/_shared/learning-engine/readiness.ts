import { clamp, daysBetween } from './math.ts';
import { computeRetrievabilityScore } from './stability.ts';
import { ReadinessSnapshot, UserQuestionState } from './types.ts';

export const projectExamRetentionProbability = ({
  pEstimated,
  stabilityScore,
  fromDate,
  examDate
}: {
  pEstimated: number;
  stabilityScore: number;
  fromDate: Date;
  examDate: Date | null;
}) => {
  if (!examDate) return clamp(0.25, 0.95, pEstimated);
  const elapsedDays = daysBetween(fromDate, examDate);
  const retentionCurve = computeRetrievabilityScore({ stabilityScore, elapsedDays });
  return clamp(0.05, 0.95, pEstimated * retentionCurve);
};

export const computeReadinessSnapshot = ({
  states,
  today = new Date(),
  examDate = null
}: {
  states: UserQuestionState[];
  today?: Date;
  examDate?: Date | null;
}): ReadinessSnapshot => {
  if (states.length === 0) {
    return {
      readiness: 0.25,
      readinessLower: null,
      readinessUpper: null,
      overdueCount: 0,
      fragileCount: 0,
      masteredCount: 0,
      projectedReadiness: null
    };
  }

  const projectedValues = states.map((state) =>
    projectExamRetentionProbability({
      pEstimated: state.pCorrectEstimated,
      stabilityScore: state.stabilityScore,
      fromDate: today,
      examDate
    })
  );

  const readiness = projectedValues.reduce((total, value) => total + value, 0) / states.length;
  const rangeHalfWidth =
    states.length >= 5 ? Math.min(0.08, 0.22 / Math.sqrt(states.length)) : null;

  return {
    readiness,
    readinessLower: rangeHalfWidth === null ? null : clamp(0, 1, readiness - rangeHalfWidth),
    readinessUpper: rangeHalfWidth === null ? null : clamp(0, 1, readiness + rangeHalfWidth),
    overdueCount: states.filter((state) => state.nextReviewAt && new Date(state.nextReviewAt) <= today)
      .length,
    fragileCount: states.filter((state) => state.masteryLevel <= 1).length,
    masteredCount: states.filter((state) => state.masteryLevel >= 4).length,
    projectedReadiness: examDate ? readiness : null
  };
};
