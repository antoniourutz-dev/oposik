import { describe, expect, it } from 'vitest';
import { buildPracticeCoachPlan } from './coach';

describe('buildPracticeCoachPlan', () => {
  const referenceDate = new Date('2026-03-27T12:00:00Z');

  it('prioriza simulacro cuando ya hay base pero falta medicion real', () => {
    const plan = buildPracticeCoachPlan(
      {
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
          overconfidenceRate: null,
          recommendedMode: 'simulacro',
          pressureMessage: 'Ya tienes base suficiente. Conviene medirte con un simulacro completo.',
        },
        examTarget: null,
        recommendedBatchNumber: 4,
        totalBatches: 25,
        batchSize: 20,
      },
      referenceDate,
    );

    expect(plan.mode).toBe('simulacro');
    expect(plan.primaryActionLabel).toContain('simulacro');
    expect(plan.title).toContain('nivel real');
  });

  it('activa anti-trampas cuando la brecha bajo presion es alta', () => {
    const plan = buildPracticeCoachPlan(
      {
        learningDashboard: {
          totalQuestions: 500,
          seenQuestions: 200,
          readiness: 0.74,
          readinessLower: 0.7,
          readinessUpper: 0.78,
          projectedReadiness: 0.77,
          overdueCount: 8,
          backlogCount: 8,
          fragileCount: 22,
          consolidatingCount: 38,
          solidCount: 46,
          masteredCount: 32,
          newCount: 300,
          recommendedReviewCount: 16,
          recommendedNewCount: 4,
          recommendedTodayCount: 20,
          recommendedMode: 'mixed',
          focusMessage: 'Hoy conviene consolidar y afinar lectura.',
          dailyReviewCapacity: 30,
          dailyNewCapacity: 8,
          examDate: '2026-05-30',
          riskBreakdown: [],
        },
        pressureInsights: {
          learningAccuracy: 0.83,
          simulacroAccuracy: 0.67,
          pressureGap: 0.16,
          lastSimulacroAccuracy: 0.67,
          lastSimulacroFinishedAt: '2026-03-26T18:00:00Z',
          avgSimulacroFatigue: 0.24,
          overconfidenceRate: 0.18,
          recommendedMode: 'anti_trap',
          pressureMessage: 'Tu rendimiento cae 16 puntos bajo presion.',
        },
        examTarget: null,
        recommendedBatchNumber: 6,
        totalBatches: 25,
        batchSize: 20,
      },
      referenceDate,
    );

    expect(plan.mode).toBe('anti_trap');
    expect(plan.focusLabel).toBe('Errores caros');
    expect(plan.chips[0]?.value).toBe('16 pts');
  });

  it('entra en modo rescate cuando el backlog supera la capacidad diaria', () => {
    const plan = buildPracticeCoachPlan(
      {
        learningDashboard: {
          totalQuestions: 500,
          seenQuestions: 90,
          readiness: 0.58,
          readinessLower: 0.54,
          readinessUpper: 0.62,
          projectedReadiness: 0.63,
          overdueCount: 48,
          backlogCount: 60,
          fragileCount: 18,
          consolidatingCount: 24,
          solidCount: 14,
          masteredCount: 8,
          newCount: 410,
          recommendedReviewCount: 24,
          recommendedNewCount: 2,
          recommendedTodayCount: 26,
          recommendedMode: 'mixed',
          focusMessage: 'Tienes demasiados repasos vencidos para hoy.',
          dailyReviewCapacity: 20,
          dailyNewCapacity: 6,
          examDate: null,
          riskBreakdown: [],
        },
        pressureInsights: null,
        examTarget: null,
        recommendedBatchNumber: 2,
        totalBatches: 25,
        batchSize: 20,
      },
      referenceDate,
    );

    expect(plan.tone).toBe('rescue');
    expect(plan.mode).toBe('mixed');
    expect(plan.title).toContain('Rescata');
  });

  it('recomienda avance limpio cuando no hay urgencias', () => {
    const plan = buildPracticeCoachPlan(
      {
        learningDashboard: {
          totalQuestions: 500,
          seenQuestions: 250,
          readiness: 0.81,
          readinessLower: 0.77,
          readinessUpper: 0.84,
          projectedReadiness: 0.84,
          overdueCount: 0,
          backlogCount: 0,
          fragileCount: 10,
          consolidatingCount: 18,
          solidCount: 62,
          masteredCount: 54,
          newCount: 250,
          recommendedReviewCount: 0,
          recommendedNewCount: 10,
          recommendedTodayCount: 10,
          recommendedMode: 'standard',
          focusMessage: 'Puedes abrir nuevas sin comprometer el mantenimiento.',
          dailyReviewCapacity: 30,
          dailyNewCapacity: 10,
          examDate: '2026-07-01',
          riskBreakdown: [],
        },
        pressureInsights: {
          learningAccuracy: 0.82,
          simulacroAccuracy: 0.79,
          pressureGap: 0.03,
          lastSimulacroAccuracy: 0.79,
          lastSimulacroFinishedAt: '2026-03-25T18:00:00Z',
          avgSimulacroFatigue: 0.18,
          overconfidenceRate: 0.09,
          recommendedMode: null,
          pressureMessage: 'La brecha bajo presion esta controlada.',
        },
        examTarget: null,
        recommendedBatchNumber: 8,
        totalBatches: 25,
        batchSize: 20,
      },
      referenceDate,
    );

    expect(plan.mode).toBe('standard');
    expect(plan.primaryActionLabel).toContain('8');
    expect(plan.focusLabel).toBe('Avance limpio');
  });
});
