import { describe, expect, it } from 'vitest';
import { buildCoachPlanV2, buildPracticeCoachPlanV2, toCoachDecisionLog } from './coachV2';

describe('Coach V2', () => {
  const referenceDate = new Date('2026-03-28T12:00:00Z');

  it('ordena recentSessions internamente (daysSinceLastSession y accuracyRecent no dependen del orden)', () => {
    const plan = buildCoachPlanV2(
      {
        learningDashboard: {
          totalQuestions: 500,
          seenQuestions: 200,
          readiness: 0.72,
          readinessLower: null,
          readinessUpper: null,
          projectedReadiness: null,
          overdueCount: 0,
          backlogCount: 0,
          fragileCount: 0,
          consolidatingCount: 0,
          solidCount: 0,
          masteredCount: 0,
          newCount: 0,
          recommendedReviewCount: 0,
          recommendedNewCount: 0,
          recommendedTodayCount: 0,
          recommendedMode: 'mixed',
          focusMessage: 'ok',
          dailyReviewCapacity: 35,
          dailyNewCapacity: 10,
          examDate: null,
          riskBreakdown: [],
        },
        learningDashboardV2: null,
        pressureInsights: null,
        pressureInsightsV2: null,
        examTarget: null,
        // Desordenadas: la más reciente va en medio.
        recentSessions: [
          {
            id: 'a',
            mode: 'standard',
            title: 'A',
            startedAt: '2026-03-20T10:00:00Z',
            finishedAt: '2026-03-20T10:10:00Z',
            score: 7,
            total: 10,
            questionIds: [],
          },
          {
            id: 'b',
            mode: 'mixed',
            title: 'B',
            startedAt: '2026-03-27T08:00:00Z',
            finishedAt: '2026-03-27T08:12:00Z',
            score: 8,
            total: 10,
            questionIds: [],
          },
          {
            id: 'c',
            mode: 'standard',
            title: 'C',
            startedAt: '2026-03-22T10:00:00Z',
            finishedAt: '2026-03-22T10:10:00Z',
            score: 6,
            total: 10,
            questionIds: [],
          },
        ],
        recommendedBatchNumber: 4,
        totalBatches: 25,
        batchSize: 20,
      },
      referenceDate,
    );

    expect(plan.evidence.supportingSignals.join(' ')).toContain('Última sesión hace 1d');
    expect(plan.evidence.supportingSignals.join(' ')).toContain('Acierto reciente 70%');
  });

  it('no recomienda simulacro si hay gap alto pero base reciente es baja (regla S3)', () => {
    const plan = buildCoachPlanV2(
      {
        learningDashboard: {
          totalQuestions: 500,
          seenQuestions: 200,
          readiness: 0.5,
          readinessLower: null,
          readinessUpper: null,
          projectedReadiness: null,
          overdueCount: 0,
          backlogCount: 0,
          fragileCount: 0,
          consolidatingCount: 0,
          solidCount: 0,
          masteredCount: 0,
          newCount: 0,
          recommendedReviewCount: 0,
          recommendedNewCount: 0,
          recommendedTodayCount: 0,
          recommendedMode: null,
          focusMessage: 'ok',
          dailyReviewCapacity: 35,
          dailyNewCapacity: 10,
          examDate: '2026-04-15',
          riskBreakdown: [],
        },
        learningDashboardV2: null,
        pressureInsights: { pressureGap: 0.2 } as any,
        pressureInsightsV2: null,
        examTarget: null,
        recentSessions: [
          {
            id: 'x',
            mode: 'standard',
            title: 'X',
            startedAt: '2026-03-27T08:00:00Z',
            finishedAt: '2026-03-27T08:12:00Z',
            score: 4,
            total: 10,
            questionIds: [],
          },
        ],
        recommendedBatchNumber: 4,
        totalBatches: 25,
        batchSize: 20,
      } as any,
      referenceDate,
    );

    expect(plan.primaryAction).not.toBe('simulacro');
    expect(['review', 'recovery', 'standard', 'anti_trap']).toContain(plan.primaryAction);
  });

  it('fatiga alta bloquea intensidad high', () => {
    const plan = buildCoachPlanV2(
      {
        learningDashboard: {
          totalQuestions: 500,
          seenQuestions: 200,
          readiness: 0.85,
          readinessLower: null,
          readinessUpper: null,
          projectedReadiness: null,
          overdueCount: 0,
          backlogCount: 0,
          fragileCount: 0,
          consolidatingCount: 0,
          solidCount: 0,
          masteredCount: 0,
          newCount: 0,
          recommendedReviewCount: 0,
          recommendedNewCount: 0,
          recommendedTodayCount: 0,
          recommendedMode: null,
          focusMessage: 'ok',
          dailyReviewCapacity: 35,
          dailyNewCapacity: 10,
          examDate: '2026-04-01',
          riskBreakdown: [],
        },
        learningDashboardV2: null,
        pressureInsights: null,
        pressureInsightsV2: { avgSimulacroFatigue: 0.92 } as any,
        examTarget: null,
        recentSessions: [
          {
            id: 'x',
            mode: 'standard',
            title: 'X',
            startedAt: '2026-03-27T08:00:00Z',
            finishedAt: '2026-03-27T08:12:00Z',
            score: 9,
            total: 10,
            questionIds: [],
          },
        ],
        recommendedBatchNumber: 4,
        totalBatches: 25,
        batchSize: 20,
      } as any,
      referenceDate,
    );

    expect(plan.intensity).not.toBe('high');
  });

  it('adaptador legado no reinterpreta acción: recovery/review no mapean a simulacro', () => {
    const legacy = buildPracticeCoachPlanV2(
      {
        learningDashboard: null,
        learningDashboardV2: null,
        pressureInsights: null,
        pressureInsightsV2: null,
        examTarget: null,
        recentSessions: [],
        recommendedBatchNumber: 3,
        totalBatches: 25,
        batchSize: 20,
      },
      referenceDate,
    );

    expect(['standard', 'mixed', 'anti_trap', 'simulacro', 'random']).toContain(legacy.mode);
    expect(legacy.mode).not.toBe('simulacro');
  });

  it('gray zone: margen pequeño baja confidence y evita simulacro/push', () => {
    const plan = buildCoachPlanV2(
      {
        learningDashboard: {
          totalQuestions: 500,
          seenQuestions: 200,
          readiness: 0.7,
          readinessLower: null,
          readinessUpper: null,
          projectedReadiness: null,
          overdueCount: 0,
          backlogCount: 0,
          fragileCount: 0,
          consolidatingCount: 0,
          solidCount: 0,
          masteredCount: 0,
          newCount: 0,
          recommendedReviewCount: 0,
          recommendedNewCount: 0,
          recommendedTodayCount: 0,
          recommendedMode: 'mixed',
          focusMessage: 'ok',
          dailyReviewCapacity: 35,
          dailyNewCapacity: 10,
          // ~17 días desde referenceDate → examProximity ~0.71
          examDate: '2026-04-14',
          riskBreakdown: [],
        },
        learningDashboardV2: { backlogOverdueCount: 0 } as any,
        // Hacemos push ligeramente > simulacro, con margen pequeño → gray zone.
        pressureInsights: { pressureGap: 0.25 } as any,
        pressureInsightsV2: null,
        examTarget: null,
        recentSessions: [
          {
            id: 'x',
            mode: 'standard',
            title: 'X',
            startedAt: '2026-03-27T08:00:00Z',
            finishedAt: '2026-03-27T08:12:00Z',
            score: 6,
            total: 10,
            questionIds: [],
          },
        ],
        recommendedBatchNumber: 4,
        totalBatches: 25,
        batchSize: 20,
      } as any,
      referenceDate,
    );

    expect(plan.decisionMeta?.grayZoneTriggered).toBe(true);
    expect(plan.confidence).toBeLessThan(0.68);
    expect(['simulacro', 'push']).not.toContain(plan.primaryAction);
  });

  it('confidence sube con más datos y con margen grande', () => {
    const few = buildCoachPlanV2(
      {
        learningDashboard: null,
        learningDashboardV2: null,
        pressureInsights: null,
        pressureInsightsV2: null,
        examTarget: null,
        recentSessions: [],
        recommendedBatchNumber: 2,
        totalBatches: 25,
        batchSize: 20,
      } as any,
      referenceDate,
    );

    const strong = buildCoachPlanV2(
      {
        learningDashboard: {
          totalQuestions: 500,
          seenQuestions: 300,
          readiness: 0.9,
          readinessLower: null,
          readinessUpper: null,
          projectedReadiness: null,
          overdueCount: 60,
          backlogCount: 60,
          fragileCount: 0,
          consolidatingCount: 0,
          solidCount: 0,
          masteredCount: 0,
          newCount: 0,
          recommendedReviewCount: 0,
          recommendedNewCount: 0,
          recommendedTodayCount: 0,
          recommendedMode: 'mixed',
          focusMessage: 'ok',
          dailyReviewCapacity: 20,
          dailyNewCapacity: 10,
          examDate: '2026-06-20',
          riskBreakdown: [],
        },
        learningDashboardV2: { backlogOverdueCount: 60 } as any,
        pressureInsights: { pressureGap: 0.02 } as any,
        pressureInsightsV2: { avgSimulacroFatigue: 0.12 } as any,
        examTarget: null,
        recentSessions: [
          {
            id: 'x',
            mode: 'standard',
            title: 'X',
            startedAt: '2026-03-27T08:00:00Z',
            finishedAt: '2026-03-27T08:12:00Z',
            score: 9,
            total: 10,
            questionIds: [],
          },
        ],
        recommendedBatchNumber: 4,
        totalBatches: 25,
        batchSize: 20,
      } as any,
      referenceDate,
    );

    expect(strong.debug?.decisionMargin).toBeGreaterThan(0.08);
    expect(strong.confidence).toBeGreaterThan(few.confidence);
  });

  it('reasons auditables: si se evita simulacro por base inestable, la reason lo explica', () => {
    const plan = buildCoachPlanV2(
      {
        learningDashboard: {
          totalQuestions: 500,
          seenQuestions: 220,
          readiness: 0.7,
          readinessLower: null,
          readinessUpper: null,
          projectedReadiness: null,
          overdueCount: 0,
          backlogCount: 0,
          fragileCount: 0,
          consolidatingCount: 0,
          solidCount: 0,
          masteredCount: 0,
          newCount: 0,
          recommendedReviewCount: 0,
          recommendedNewCount: 0,
          recommendedTodayCount: 0,
          recommendedMode: 'mixed',
          focusMessage: 'ok',
          dailyReviewCapacity: 35,
          dailyNewCapacity: 10,
          examDate: '2026-04-10',
          riskBreakdown: [],
        },
        learningDashboardV2: null,
        pressureInsights: { pressureGap: 0.2 } as any,
        pressureInsightsV2: null,
        examTarget: null,
        recentSessions: [
          {
            id: 'x',
            mode: 'standard',
            title: 'X',
            startedAt: '2026-03-27T08:00:00Z',
            finishedAt: '2026-03-27T08:12:00Z',
            score: 4,
            total: 10,
            questionIds: [],
          },
        ],
        recommendedBatchNumber: 4,
        totalBatches: 25,
        batchSize: 20,
      } as any,
      referenceDate,
    );

    expect(plan.primaryAction).not.toBe('simulacro');
    expect(plan.reasons.join(' ')).toMatch(/base.*estable.*simulacro/i);
  });

  it('debug payload existe y expone campos esperados', () => {
    const plan = buildCoachPlanV2(
      {
        learningDashboard: null,
        learningDashboardV2: null,
        pressureInsights: null,
        pressureInsightsV2: null,
        examTarget: null,
        recentSessions: [],
        recommendedBatchNumber: 2,
        totalBatches: 25,
        batchSize: 20,
      } as any,
      referenceDate,
    );

    expect(plan.debug).toBeTruthy();
    expect(plan.debug?.signals).toBeTruthy();
    expect(plan.debug?.scores).toBeTruthy();
    expect(plan.debug?.safety).toBeTruthy();
    expect(plan.debug?.candidates).toBeTruthy();
    expect(typeof plan.debug?.decisionMargin).toBe('number');
    expect(typeof plan.debug?.isGrayZone).toBe('boolean');
    expect(Array.isArray(plan.debug?.defaultsUsed)).toBe(true);
  });

  it('decisionMeta refleja downgrade por gray zone (actionBefore/actionAfter)', () => {
    const plan = buildCoachPlanV2(
      {
        learningDashboard: {
          totalQuestions: 500,
          seenQuestions: 200,
          readiness: 0.7,
          readinessLower: null,
          readinessUpper: null,
          projectedReadiness: null,
          overdueCount: 0,
          backlogCount: 0,
          fragileCount: 0,
          consolidatingCount: 0,
          solidCount: 0,
          masteredCount: 0,
          newCount: 0,
          recommendedReviewCount: 0,
          recommendedNewCount: 0,
          recommendedTodayCount: 0,
          recommendedMode: 'mixed',
          focusMessage: 'ok',
          dailyReviewCapacity: 35,
          dailyNewCapacity: 10,
          examDate: '2026-04-14',
          riskBreakdown: [],
        },
        learningDashboardV2: { backlogOverdueCount: 0 } as any,
        pressureInsights: { pressureGap: 0.25 } as any,
        pressureInsightsV2: null,
        examTarget: null,
        recentSessions: [
          {
            id: 'x',
            mode: 'standard',
            title: 'X',
            startedAt: '2026-03-27T08:00:00Z',
            finishedAt: '2026-03-27T08:12:00Z',
            score: 6,
            total: 10,
            questionIds: [],
          },
        ],
        recommendedBatchNumber: 4,
        totalBatches: 25,
        batchSize: 20,
      } as any,
      referenceDate,
    );

    expect(plan.decisionMeta?.grayZoneTriggered).toBe(true);
    expect(plan.decisionMeta?.aggressiveActionDowngraded).toBe(true);
    expect(plan.decisionMeta?.actionBeforeGrayZone).toBeTruthy();
    expect(plan.decisionMeta?.actionAfterGrayZone).toBe(plan.primaryAction);
  });

  it('defaultsUsed registra ausencia de señales sin duplicados', () => {
    const plan = buildCoachPlanV2(
      {
        learningDashboard: null,
        learningDashboardV2: null,
        pressureInsights: null,
        pressureInsightsV2: null,
        examTarget: null,
        recentSessions: [],
        recommendedBatchNumber: 2,
        totalBatches: 25,
        batchSize: 20,
      } as any,
      referenceDate,
    );

    const defaults = plan.decisionMeta?.defaultsUsed ?? [];
    expect(defaults).toContain('accuracyRecent:none');
    expect(defaults).toContain('daysSinceLastSession:none');
    expect(defaults).toContain('pressureGap:none');
    expect(defaults).toContain('examProximity:none');
    expect(defaults).toContain('fatigueRisk:baseline');
    expect(new Set(defaults).size).toBe(defaults.length);
  });

  it('safetyTriggeredKeys registra avoidPressureFirst y capHighIntensityForFatigue', () => {
    const plan = buildCoachPlanV2(
      {
        learningDashboard: {
          totalQuestions: 500,
          seenQuestions: 200,
          readiness: 0.6,
          readinessLower: null,
          readinessUpper: null,
          projectedReadiness: null,
          overdueCount: 0,
          backlogCount: 0,
          fragileCount: 0,
          consolidatingCount: 0,
          solidCount: 0,
          masteredCount: 0,
          newCount: 0,
          recommendedReviewCount: 0,
          recommendedNewCount: 0,
          recommendedTodayCount: 0,
          recommendedMode: 'mixed',
          focusMessage: 'ok',
          dailyReviewCapacity: 35,
          dailyNewCapacity: 10,
          examDate: '2026-04-10',
          riskBreakdown: [],
        },
        learningDashboardV2: null,
        pressureInsights: { pressureGap: 0.2 } as any,
        pressureInsightsV2: { avgSimulacroFatigue: 0.92 } as any,
        examTarget: null,
        recentSessions: [
          {
            id: 'x',
            mode: 'standard',
            title: 'X',
            startedAt: '2026-03-27T08:00:00Z',
            finishedAt: '2026-03-27T08:12:00Z',
            score: 4,
            total: 10,
            questionIds: [],
          },
        ],
        recommendedBatchNumber: 4,
        totalBatches: 25,
        batchSize: 20,
      } as any,
      referenceDate,
    );

    const keys = plan.decisionMeta?.safetyTriggeredKeys ?? [];
    expect(keys).toContain('avoidPressureFirst');
    expect(keys).toContain('capHighIntensityForFatigue');
  });

  it('toCoachDecisionLog devuelve resumen compacto y coherente', () => {
    const plan = buildCoachPlanV2(
      {
        learningDashboard: null,
        learningDashboardV2: null,
        pressureInsights: null,
        pressureInsightsV2: null,
        examTarget: null,
        recentSessions: [],
        recommendedBatchNumber: 2,
        totalBatches: 25,
        batchSize: 20,
      } as any,
      referenceDate,
    );

    const log = toCoachDecisionLog(plan);
    expect(log).toHaveProperty('primaryAction');
    expect(log).toHaveProperty('confidence');
    expect(Array.isArray(log.defaultsUsed)).toBe(true);
    expect(Array.isArray(log.safetyTriggeredKeys)).toBe(true);
    expect(typeof log.grayZoneTriggered).toBe('boolean');
  });
});

