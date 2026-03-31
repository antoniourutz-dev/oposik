import { describe, expect, it } from 'vitest';
import {
  computeOverconfidenceScore,
  computeSessionFatigueScore,
  computeBaseProbability,
  computeExamFactor,
  computeNextIntervalDays,
  computeReadinessSnapshot,
  getErrorTypeLabel,
  inferAttemptErrorType,
  updateQuestionState,
} from './index';
import { UserQuestionState } from './types';

describe('learningEngine', () => {
  it('calcula la probabilidad base con suavizado de Laplace', () => {
    expect(computeBaseProbability(0, 0)).toBe(0.25);
    expect(computeBaseProbability(1, 1)).toBeCloseTo(0.6667, 3);
    expect(computeBaseProbability(5, 5)).toBeCloseTo(0.8571, 3);
  });

  it('comprime los intervalos cuando el examen esta cerca', () => {
    expect(computeExamFactor(140)).toBe(1);
    expect(computeExamFactor(75)).toBe(0.9);
    expect(computeExamFactor(45)).toBe(0.8);
    expect(computeExamFactor(10)).toBe(0.65);

    expect(
      computeNextIntervalDays({
        isCorrect: true,
        masteryLevel: 3,
        difficultyFactor: 1,
        latencyFactor: 1,
        examFactor: 0.65,
      }),
    ).toBe(9);
  });

  it('eleva estabilidad y programa repaso cuando una pregunta nueva se acierta rapido', () => {
    const transition = updateQuestionState({
      previousState: null,
      examDate: new Date('2026-06-30T00:00:00.000Z'),
      attempt: {
        userId: 'u1',
        questionId: 'q1',
        curriculum: 'general',
        questionNumber: 10,
        statement: 'Pregunta 10',
        category: 'Tema 1',
        explanation: 'Explicacion',
        selectedOption: 'a',
        correctOption: 'a',
        isCorrect: true,
        responseTimeMs: 9000,
        timeToFirstSelectionMs: 4000,
        changedAnswer: false,
        answeredAt: '2026-03-27T10:00:00.000Z',
        referenceTimeMs: 12000,
        globalDifficulty: 0.4,
      },
    });

    expect(transition.nextState.attempts).toBe(1);
    expect(transition.nextState.correctAttempts).toBe(1);
    expect(transition.nextState.masteryLevel).toBe(1);
    expect(transition.nextState.stabilityScore).toBeGreaterThan(1);
    expect(transition.nextState.pCorrectEstimated).toBeGreaterThan(0.7);
    expect(transition.intervalDays).toBeGreaterThanOrEqual(1);
    expect(transition.nextState.nextReviewAt).toBeTruthy();
  });

  it('detecta lapsos cuando falla una pregunta antes solida', () => {
    const previousState: UserQuestionState = {
      userId: 'u1',
      questionId: 'q2',
      curriculum: 'general',
      questionNumber: 11,
      statement: 'Pregunta 11',
      category: 'Tema 2',
      explanation: null,
      attempts: 5,
      correctAttempts: 5,
      incorrectAttempts: 0,
      consecutiveCorrect: 5,
      consecutiveIncorrect: 0,
      distinctSuccessfulDays: 3,
      lastResult: 'correct',
      lastSelectedOption: 'b',
      lastSeenAt: '2026-03-25T10:00:00.000Z',
      lastCorrectAt: '2026-03-25T10:00:00.000Z',
      nextReviewAt: '2026-04-10T10:00:00.000Z',
      masteryLevel: 3,
      stabilityScore: 12,
      retrievabilityScore: 0.88,
      pCorrectEstimated: 0.88,
      avgResponseTimeMs: 8200,
      medianResponseTimeMs: 8000,
      lastResponseTimeMs: 7900,
      fastCorrectCount: 4,
      slowCorrectCount: 1,
      lapseCount: 0,
      examRetentionProbability: 0.81,
      reviewsNeededBeforeExam: 1,
      dominantErrorType: null,
      timesExplanationOpened: 0,
      timesChangedAnswer: 0,
    };

    const transition = updateQuestionState({
      previousState,
      examDate: new Date('2026-06-30T00:00:00.000Z'),
      attempt: {
        userId: 'u1',
        questionId: 'q2',
        curriculum: 'general',
        questionNumber: 11,
        statement: 'Pregunta 11',
        category: 'Tema 2',
        explanation: null,
        selectedOption: 'c',
        correctOption: 'b',
        isCorrect: false,
        responseTimeMs: 5000,
        timeToFirstSelectionMs: 2500,
        changedAnswer: true,
        answeredAt: '2026-03-27T12:00:00.000Z',
        errorTypeInferred: 'sobreconfianza',
        referenceTimeMs: 12000,
        globalDifficulty: 0.5,
      },
    });

    expect(transition.nextState.lapseCount).toBe(1);
    expect(transition.nextState.consecutiveCorrect).toBe(0);
    expect(transition.nextState.masteryLevel).toBeLessThan(previousState.masteryLevel);
    expect(transition.nextState.dominantErrorType).toBe('sobreconfianza');
    expect(transition.intervalDays).toBe(1);
  });

  it('resume readiness y cuenta fragiles, dominadas y vencidas', () => {
    const snapshot = computeReadinessSnapshot({
      today: new Date('2026-03-27T00:00:00.000Z'),
      examDate: new Date('2026-04-30T00:00:00.000Z'),
      states: [
        {
          userId: 'u1',
          questionId: 'a',
          curriculum: 'general',
          questionNumber: 1,
          statement: 'A',
          category: null,
          explanation: null,
          attempts: 0,
          correctAttempts: 0,
          incorrectAttempts: 0,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 0,
          distinctSuccessfulDays: 0,
          lastResult: null,
          lastSelectedOption: null,
          lastSeenAt: null,
          lastCorrectAt: null,
          nextReviewAt: '2026-03-26T00:00:00.000Z',
          masteryLevel: 1,
          stabilityScore: 2,
          retrievabilityScore: 0.5,
          pCorrectEstimated: 0.55,
          avgResponseTimeMs: null,
          medianResponseTimeMs: null,
          lastResponseTimeMs: null,
          fastCorrectCount: 0,
          slowCorrectCount: 0,
          lapseCount: 0,
          examRetentionProbability: 0.4,
          reviewsNeededBeforeExam: 2,
          dominantErrorType: null,
          timesExplanationOpened: 0,
          timesChangedAnswer: 0,
        },
        {
          userId: 'u1',
          questionId: 'b',
          curriculum: 'general',
          questionNumber: 2,
          statement: 'B',
          category: null,
          explanation: null,
          attempts: 6,
          correctAttempts: 6,
          incorrectAttempts: 0,
          consecutiveCorrect: 6,
          consecutiveIncorrect: 0,
          distinctSuccessfulDays: 3,
          lastResult: 'correct',
          lastSelectedOption: 'a',
          lastSeenAt: '2026-03-24T00:00:00.000Z',
          lastCorrectAt: '2026-03-24T00:00:00.000Z',
          nextReviewAt: '2026-04-12T00:00:00.000Z',
          masteryLevel: 4,
          stabilityScore: 18,
          retrievabilityScore: 0.9,
          pCorrectEstimated: 0.88,
          avgResponseTimeMs: 8200,
          medianResponseTimeMs: 8000,
          lastResponseTimeMs: 7800,
          fastCorrectCount: 5,
          slowCorrectCount: 1,
          lapseCount: 0,
          examRetentionProbability: 0.84,
          reviewsNeededBeforeExam: 1,
          dominantErrorType: null,
          timesExplanationOpened: 0,
          timesChangedAnswer: 0,
        },
      ],
    });

    expect(snapshot.overdueCount).toBe(1);
    expect(snapshot.fragileCount).toBe(1);
    expect(snapshot.masteredCount).toBe(1);
    expect(snapshot.readiness).toBeGreaterThan(0.05);
    expect(snapshot.projectedReadiness).not.toBeNull();
  });

  it('infiere errores rentables para preguntas trampa', () => {
    expect(
      inferAttemptErrorType({
        statement:
          'Segun la norma, cual de las siguientes es incorrecta excepto en caso de urgencia?',
        selectedOptionText: 'En 5 dias naturales',
        correctOptionText: 'En 10 dias habiles',
        responseTimeMs: 6200,
        isCorrect: false,
      }),
    ).toBe('excepcion');

    expect(
      inferAttemptErrorType({
        statement: 'Cual es el plazo para resolver el expediente?',
        selectedOptionText: '15 dias naturales',
        correctOptionText: '10 dias habiles',
        responseTimeMs: 1800,
        isCorrect: false,
      }),
    ).toBe('sobreconfianza');

    expect(getErrorTypeLabel('plazo')).toBe('Plazo');
  });

  it('mide fatiga y sobreconfianza de sesion', () => {
    const fatigueScore = computeSessionFatigueScore([
      { isCorrect: true, responseTimeMs: 6000 },
      { isCorrect: true, responseTimeMs: 6500 },
      { isCorrect: true, responseTimeMs: 6800 },
      { isCorrect: false, responseTimeMs: 11000 },
      { isCorrect: false, responseTimeMs: 12500 },
      { isCorrect: false, responseTimeMs: 13500 },
    ]);
    const overconfidenceScore = computeOverconfidenceScore([
      { isCorrect: false, responseTimeMs: 1700 },
      { isCorrect: true, responseTimeMs: 6000 },
      { isCorrect: false, responseTimeMs: 2200, changedAnswer: true },
    ]);

    expect(fatigueScore).toBeGreaterThan(0.2);
    expect(overconfidenceScore).toBeGreaterThan(0.3);
  });
});
