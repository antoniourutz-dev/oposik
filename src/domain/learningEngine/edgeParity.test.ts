import { describe, expect, it } from 'vitest';

import { buildPracticeCoachPlan as buildCoachClient } from './coach';
import { updateQuestionState as updateQuestionStateClient } from './updateQuestionState';
import { computeNextIntervalDays as computeNextIntervalDaysClient } from './scheduler';
import { computeSessionFatigueScore as computeSessionFatigueScoreClient } from './fatigue';

import { buildPracticeCoachPlan as buildCoachEdge } from '../../../supabase/functions/_shared/learning-engine/coach.ts';
import { updateQuestionState as updateQuestionStateEdge } from '../../../supabase/functions/_shared/learning-engine/updateQuestionState.ts';
import { computeNextIntervalDays as computeNextIntervalDaysEdge } from '../../../supabase/functions/_shared/learning-engine/scheduler.ts';
import { computeSessionFatigueScore as computeSessionFatigueScoreEdge } from '../../../supabase/functions/_shared/learning-engine/fatigue.ts';

describe('learningEngine parity (client vs edge)', () => {
  it('coach: buildPracticeCoachPlan', () => {
    const referenceDate = new Date('2026-03-27T12:00:00Z');
    type CoachInputClient = Parameters<typeof buildCoachClient>[0];
    type CoachInputEdge = Parameters<typeof buildCoachEdge>[0];

    const input = {
      learningDashboard: {
        totalQuestions: 500,
        seenQuestions: 140,
        readiness: 0.72,
        readinessLower: 0.68,
        readinessUpper: 0.75,
        projectedReadiness: 0.76,
        overdueCount: 0,
        backlogCount: 0,
        fragileCount: 18,
        consolidatingCount: 42,
        solidCount: 28,
        masteredCount: 22,
        newCount: 360,
        recommendedReviewCount: 12,
        recommendedNewCount: 6,
        recommendedTodayCount: 18,
        recommendedMode: 'mixed',
        focusMessage: 'Hoy conviene consolidar 12 preguntas utiles.',
        dailyReviewCapacity: 35,
        dailyNewCapacity: 10,
        examDate: '2026-06-15',
        riskBreakdown: [],
      },
      pressureInsights: {
        learningAccuracy: 0.78,
        simulacroAccuracy: null,
        pressureGap: null,
        lastSimulacroAccuracy: null,
        lastSimulacroFinishedAt: null,
        avgSimulacroFatigue: null,
        pressureMessage: 'Buen ritmo; aun falta una medicion real.',
        overconfidenceRate: null,
        recommendedMode: 'mixed',
      },
      examTarget: null,
      recommendedBatchNumber: 3,
      totalBatches: 25,
      batchSize: 20,
    } satisfies CoachInputClient;

    expect(buildCoachClient(input, referenceDate)).toEqual(
      buildCoachEdge(input as unknown as CoachInputEdge, referenceDate),
    );
  });

  it('scheduler: computeNextIntervalDays', () => {
    type NextIntervalInputClient = Parameters<typeof computeNextIntervalDaysClient>[0];
    type NextIntervalInputEdge = Parameters<typeof computeNextIntervalDaysEdge>[0];

    const inputA = {
      isCorrect: true,
      masteryLevel: 2,
      difficultyFactor: 0.95,
      latencyFactor: 0.9,
      examFactor: 0.8,
    } satisfies NextIntervalInputClient;
    expect(computeNextIntervalDaysClient(inputA)).toEqual(
      computeNextIntervalDaysEdge(inputA as unknown as NextIntervalInputEdge),
    );

    const inputB = {
      isCorrect: false,
      masteryLevel: 4,
      difficultyFactor: 1,
      latencyFactor: 1,
      examFactor: 1,
    } satisfies NextIntervalInputClient;
    expect(computeNextIntervalDaysClient(inputB)).toEqual(
      computeNextIntervalDaysEdge(inputB as unknown as NextIntervalInputEdge),
    );
  });

  it('fatigue: computeSessionFatigueScore', () => {
    type FatigueInputClient = Parameters<typeof computeSessionFatigueScoreClient>[0];
    type FatigueInputEdge = Parameters<typeof computeSessionFatigueScoreEdge>[0];

    const sessionInsights = [
      { isCorrect: true, responseTimeMs: 9000, errorTypeInferred: null, changedAnswer: false },
      { isCorrect: false, responseTimeMs: 22000, errorTypeInferred: 'lectura_rapida', changedAnswer: true },
      { isCorrect: true, responseTimeMs: 14000, errorTypeInferred: null, changedAnswer: false },
    ] satisfies FatigueInputClient;
    expect(computeSessionFatigueScoreClient(sessionInsights)).toEqual(
      computeSessionFatigueScoreEdge(sessionInsights as unknown as FatigueInputEdge),
    );
  });

  it('updateQuestionState: transition parity on a representative attempt', () => {
    type UpdateInputClient = Parameters<typeof updateQuestionStateClient>[0];
    type UpdateInputEdge = Parameters<typeof updateQuestionStateEdge>[0];

    const attempt = {
      userId: 'u1',
      questionId: 'q1',
      curriculum: 'general',
      questionNumber: 12,
      statement: 'Pregunta de ejemplo',
      category: 'A',
      explanation: 'Exp',
      selectedOption: 'a',
      correctOption: 'b',
      isCorrect: false,
      responseTimeMs: 18000,
      timeToFirstSelectionMs: 2500,
      changedAnswer: true,
      answeredAt: '2026-03-27T12:34:56.000Z',
      errorTypeInferred: 'confusion_entre_normas',
      referenceTimeMs: 15000,
      globalDifficulty: 0.45,
    } as const;

    const previousState = {
      userId: 'u1',
      questionId: 'q1',
      curriculum: 'general',
      questionNumber: 12,
      statement: 'Pregunta de ejemplo',
      category: 'A',
      explanation: 'Exp',
      attempts: 3,
      correctAttempts: 2,
      incorrectAttempts: 1,
      consecutiveCorrect: 1,
      consecutiveIncorrect: 0,
      distinctSuccessfulDays: 2,
      lastResult: 'correct',
      lastSelectedOption: 'b',
      lastSeenAt: '2026-03-26T10:00:00.000Z',
      lastCorrectAt: '2026-03-26T10:00:00.000Z',
      nextReviewAt: '2026-03-30T10:00:00.000Z',
      masteryLevel: 2,
      stabilityScore: 12,
      retrievabilityScore: 0.65,
      pCorrectEstimated: 0.7,
      avgResponseTimeMs: 15000,
      medianResponseTimeMs: 15000,
      lastResponseTimeMs: 14000,
      fastCorrectCount: 1,
      slowCorrectCount: 1,
      lapseCount: 1,
      examRetentionProbability: 0.55,
      reviewsNeededBeforeExam: 6,
      dominantErrorType: null,
      timesExplanationOpened: 0,
      timesChangedAnswer: 1,
    } as const;

    const updateInput = { previousState, attempt } satisfies UpdateInputClient;

    expect(updateQuestionStateClient(updateInput)).toEqual(
      updateQuestionStateEdge(updateInput as unknown as UpdateInputEdge),
    );
  });
});

