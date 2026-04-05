import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mapCategoryRiskSummary,
  mapExamTarget,
  mapLearningDashboard,
  mapLearningDashboardV2,
  mapPressureInsights,
  mapPressureInsightsV2,
  mapPracticeCloudError,
  mapProfile,
  mapQuestionStat,
  mapSession,
  mergeProfileNextBatchFromLatestStandardSession,
} from './practiceCloudMappers';

describe('practiceCloudMappers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detecta cuando faltan las RPC de progreso', () => {
    expect(
      mapPracticeCloudError({
        code: 'PGRST202',
        message: 'Could not find the function app.get_my_practice_profile_for_curriculum',
      }),
    ).toContain('Faltan las funciones RPC de progreso en Supabase');
  });

  it('mantiene el mapeo de sesion caducada', () => {
    expect(
      mapPracticeCloudError({
        code: '42501',
        message: 'permission denied',
      }),
    ).toBe('La sesion ha caducado. Vuelve a iniciar sesion.');
  });

  it('actualiza el indice de bloque desde la ultima sesion standard cuando el perfil RPC va atrasado', () => {
    const profile = mapProfile({
      user_id: 'u1',
      curriculum: 'osakidetza_admin',
      next_standard_batch_start_index: 0,
      total_answered: 0,
      total_correct: 0,
      total_incorrect: 0,
      total_sessions: 0,
      last_studied_at: null,
    });
    expect(profile).not.toBeNull();
    const merged = mergeProfileNextBatchFromLatestStandardSession(profile, [
      {
        session_id: 's-r',
        mode: 'random',
        finished_at: '2026-04-03T12:00:00Z',
        next_standard_batch_start_index: null,
      },
      {
        session_id: 's-std',
        mode: 'standard',
        finished_at: '2026-04-03T11:00:00Z',
        next_standard_batch_start_index: 40,
      },
    ]);
    expect(merged?.nextStandardBatchStartIndex).toBe(40);
  });

  it('convierte perfiles, sesiones y estadisticas al contrato de frontend', () => {
    const profile = mapProfile({
      user_id: 'user-1',
      total_answered: '18',
      total_correct: 11,
      total_incorrect: '7',
      total_sessions: '3',
      next_standard_batch_start_index: '40',
      last_studied_at: '2026-03-27T12:00:00Z',
    });
    const session = mapSession({
      session_id: 'session-1',
      mode: 'random',
      title: 'Repaso',
      started_at: '2026-03-27T11:00:00Z',
      finished_at: '2026-03-27T11:10:00Z',
      score: '8',
      total: '10',
    });
    const stat = mapQuestionStat({
      question_id: 'q-4',
      question_number: '12',
      statement: 'Pregunta',
      category: 'tema 1',
      explanation: 'Explicacion',
      editorial_explanation: 'Idea corta',
      attempts: '6',
      correct_attempts: '2',
      incorrect_attempts: '4',
      last_answered_at: '2026-03-27T11:10:00Z',
      last_incorrect_at: null,
    });

    expect(profile).toMatchObject({
      userId: 'user-1',
      curriculum: 'osakidetza_admin',
      nextStandardBatchStartIndex: 40,
      totalAnswered: 18,
      totalCorrect: 11,
      totalIncorrect: 7,
      totalSessions: 3,
    });
    expect(session).toMatchObject({
      id: 'session-1',
      mode: 'random',
      score: 8,
      total: 10,
    });
    expect(stat).toMatchObject({
      questionId: 'q-4',
      questionNumber: 12,
      editorialExplanation: 'Idea corta',
      incorrectAttempts: 4,
      lastIncorrectAt: null,
    });
  });

  it('convierte el dashboard adaptativo y respeta modos extendidos', () => {
    const session = mapSession({
      session_id: 'session-2',
      mode: 'mixed',
      title: 'Sesion adaptativa',
      started_at: '2026-03-27T12:00:00Z',
      finished_at: '2026-03-27T12:15:00Z',
      score: '14',
      total: '20',
    });
    const dashboard = mapLearningDashboard({
      total_questions: '120',
      seen_questions: '40',
      readiness: 0.71,
      readiness_lower: 0.67,
      readiness_upper: 0.75,
      projected_readiness: 0.71,
      overdue_count: '18',
      backlog_count: '18',
      fragile_count: '12',
      consolidating_count: '9',
      solid_count: '8',
      mastered_count: '11',
      new_count: '80',
      recommended_review_count: '18',
      recommended_new_count: '8',
      recommended_today_count: '26',
      recommended_mode: 'mixed',
      focus_message: 'Hoy conviene consolidar 18 preguntas urgentes.',
      daily_review_capacity: '35',
      daily_new_capacity: '10',
      exam_date: '2026-06-30',
      risk_breakdown: [
        { error_type: 'plazo', label: 'Plazos', count: 6 },
        { error_type: 'negacion', label: 'Negaciones', count: 4 },
      ],
    });

    expect(session.mode).toBe('mixed');
    expect(dashboard).toMatchObject({
      totalQuestions: 120,
      seenQuestions: 40,
      recommendedMode: 'mixed',
      recommendedTodayCount: 26,
      dailyReviewCapacity: 35,
    });
    expect(dashboard?.riskBreakdown).toEqual([
      { errorType: 'plazo', label: 'Plazos', count: 6 },
      { errorType: 'negacion', label: 'Negaciones', count: 4 },
    ]);
  });

  it('convierte el dashboard estadistico v2 con flags de muestra y confianza', () => {
    const dashboard = mapLearningDashboardV2({
      total_questions: '120',
      seen_questions: '42',
      coverage_rate: 0.35,
      observed_accuracy_rate: 0.7143,
      observed_accuracy_n: '84',
      observed_accuracy_ci_low: 0.61,
      observed_accuracy_ci_high: 0.8,
      observed_accuracy_sample_ok: true,
      retention_seen_rate: 0.68,
      retention_seen_n: '42',
      retention_seen_confidence_flag: 'medium',
      unseen_prior_rate: 0.25,
      exam_readiness_rate: 0.4,
      exam_readiness_ci_low: 0.34,
      exam_readiness_ci_high: 0.46,
      exam_readiness_confidence_flag: 'medium',
      backlog_overdue_count: '12',
      fragile_count: '9',
      consolidating_count: '11',
      solid_count: '8',
      mastered_count: '14',
      recommended_review_count: '12',
      recommended_new_count: '10',
      recommended_today_count: '22',
      recommended_mode: 'mixed',
      focus_message: 'Conviene consolidar antes de ampliar carga.',
      topic_breakdown: [
        {
          topic_label: 'Tema 01. Organizacion del Estado',
          raw_scope: 'common',
          question_count: '24',
          consolidated_count: '8',
          attempts: '18',
          correct_attempts: '12',
          accuracy_rate: 0.6667,
        },
        {
          topic_label: 'Tema 03. Potestad sancionadora',
          raw_scope: 'specific',
          question_count: '16',
          consolidated_count: '4',
          attempts: '10',
          correct_attempts: '6',
          accuracy_rate: 0.6,
        },
      ],
    });

    expect(dashboard).toMatchObject({
      totalQuestions: 120,
      seenQuestions: 42,
      coverageRate: 0.35,
      observedAccuracyRate: 0.7143,
      observedAccuracyN: 84,
      observedAccuracySampleOk: true,
      retentionSeenRate: 0.68,
      retentionSeenConfidenceFlag: 'medium',
      examReadinessRate: 0.4,
      examReadinessConfidenceFlag: 'medium',
      backlogOverdueCount: 12,
      recommendedMode: 'mixed',
    });
    expect(dashboard?.topicBreakdown).toEqual([
      {
        topicLabel: 'Tema 01. Organizacion del Estado',
        scope: 'common',
        attempts: 18,
        questionCount: 24,
        consolidatedCount: 8,
        unseenCount: 0,
        fragileCount: 0,
        consolidatingCount: 0,
        solidCount: 0,
        masteredCount: 0,
        correctAttempts: 12,
        accuracyRate: 0.6667,
      },
      {
        topicLabel: 'Tema 03. Potestad sancionadora',
        scope: 'specific',
        attempts: 10,
        questionCount: 16,
        consolidatedCount: 4,
        unseenCount: 0,
        fragileCount: 0,
        consolidatingCount: 0,
        solidCount: 0,
        masteredCount: 0,
        correctAttempts: 6,
        accuracyRate: 0.6,
      },
    ]);
  });

  it('convierte el objetivo de examen al contrato de frontend', () => {
    const examTarget = mapExamTarget({
      user_id: 'user-1',
      curriculum: 'general',
      exam_date: '2026-06-30',
      daily_review_capacity: '30',
      daily_new_capacity: '8',
      updated_at: '2026-03-27T19:00:00Z',
    });

    expect(examTarget).toMatchObject({
      userId: 'user-1',
      curriculum: 'general',
      examDate: '2026-06-30',
      dailyReviewCapacity: 30,
      dailyNewCapacity: 8,
    });
  });

  it('convierte el dashboard de riesgo por categoria con smoothing y confianza', () => {
    const categoryRisk = mapCategoryRiskSummary({
      category: 'Contratacion',
      attempts: '14',
      incorrect_attempts: '6',
      raw_fail_rate: 0.4286,
      smoothed_fail_rate: 0.4012,
      baseline_fail_rate: 0.2711,
      excess_risk: 0.1301,
      sample_ok: true,
      confidence_flag: 'medium',
    });

    expect(categoryRisk).toMatchObject({
      category: 'Contratacion',
      attempts: 14,
      incorrectAttempts: 6,
      rawFailRate: 0.4286,
      smoothedFailRate: 0.4012,
      baselineFailRate: 0.2711,
      excessRisk: 0.1301,
      sampleOk: true,
      confidenceFlag: 'medium',
    });
  });

  it('convierte las metricas de rendimiento bajo presion', () => {
    const insights = mapPressureInsights({
      learning_accuracy: 0.81,
      simulacro_accuracy: 0.68,
      pressure_gap: 0.13,
      last_simulacro_accuracy: 0.7,
      last_simulacro_finished_at: '2026-03-27T18:00:00Z',
      avg_simulacro_fatigue: 0.41,
      overconfidence_rate: 0.24,
      recommended_mode: 'anti_trap',
      pressure_message: 'Tu rendimiento cae 13 puntos bajo presion.',
    });

    expect(insights).toMatchObject({
      learningAccuracy: 0.81,
      simulacroAccuracy: 0.68,
      pressureGap: 0.13,
      recommendedMode: 'anti_trap',
    });
  });

  it('convierte el dashboard de presion v2 con flags de muestra', () => {
    const insights = mapPressureInsightsV2({
      learning_accuracy: 0.81,
      simulacro_accuracy: 0.68,
      pressure_gap_raw: 0.13,
      learning_session_n: '6',
      simulacro_session_n: '2',
      learning_question_n: '120',
      simulacro_question_n: '80',
      avg_simulacro_fatigue: 0.41,
      overconfidence_rate: 0.24,
      sample_ok: true,
      confidence_flag: 'high',
      recommended_mode: 'anti_trap',
      pressure_message: 'Tu rendimiento cae 13 puntos bajo presion.',
    });

    expect(insights).toMatchObject({
      learningAccuracy: 0.81,
      simulacroAccuracy: 0.68,
      pressureGapRaw: 0.13,
      learningSessionN: 6,
      simulacroSessionN: 2,
      sampleOk: true,
      confidenceFlag: 'high',
      recommendedMode: 'anti_trap',
    });
  });

  it('reconoce el read model de categorias debiles como parte del backend de progreso', () => {
    expect(
      mapPracticeCloudError({
        code: 'PGRST202',
        message: 'Could not find the function app.get_weak_category_summary',
      }),
    ).toContain('Faltan las funciones RPC de progreso en Supabase');
  });

  it('reconoce el dashboard v2 como parte del backend de progreso', () => {
    expect(
      mapPracticeCloudError({
        code: 'PGRST202',
        message: 'Could not find the function app.get_readiness_dashboard_v2',
      }),
    ).toContain('Faltan las funciones RPC de progreso en Supabase');
  });

  it('reconoce category risk v2 como parte del backend de progreso', () => {
    expect(
      mapPracticeCloudError({
        code: 'PGRST202',
        message: 'Could not find the function app.get_category_risk_dashboard',
      }),
    ).toContain('Faltan las funciones RPC de progreso en Supabase');
  });

  it('reconoce pressure dashboard v2 como parte del backend de progreso', () => {
    expect(
      mapPracticeCloudError({
        code: 'PGRST202',
        message: 'Could not find the function app.get_pressure_dashboard_v2',
      }),
    ).toContain('Faltan las funciones RPC de progreso en Supabase');
  });
});
