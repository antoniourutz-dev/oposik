import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mapExamTarget,
  mapLearningDashboard,
  mapPressureInsights,
  mapPracticeCloudError,
  mapProfile,
  mapQuestionStat,
  mapSession
} from './practiceCloudMappers';

describe('practiceCloudMappers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detecta cuando faltan las RPC de progreso', () => {
    expect(
      mapPracticeCloudError({
        code: 'PGRST202',
        message: 'Could not find the function app.get_my_practice_profile_for_curriculum'
      })
    ).toContain('Faltan las funciones RPC de progreso en Supabase');
  });

  it('mantiene el mapeo de sesion caducada', () => {
    expect(
      mapPracticeCloudError({
        code: '42501',
        message: 'permission denied'
      })
    ).toBe('La sesion ha caducado. Vuelve a iniciar sesion.');
  });

  it('convierte perfiles, sesiones y estadisticas al contrato de frontend', () => {
    const profile = mapProfile({
      user_id: 'user-1',
      total_answered: '18',
      total_correct: 11,
      total_incorrect: '7',
      total_sessions: '3',
      next_standard_batch_start_index: '40',
      last_studied_at: '2026-03-27T12:00:00Z'
    });
    const session = mapSession({
      session_id: 'session-1',
      mode: 'random',
      title: 'Repaso',
      started_at: '2026-03-27T11:00:00Z',
      finished_at: '2026-03-27T11:10:00Z',
      score: '8',
      total: '10'
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
      last_incorrect_at: null
    });

    expect(profile).toMatchObject({
      userId: 'user-1',
      curriculum: 'general',
      nextStandardBatchStartIndex: 40,
      totalAnswered: 18,
      totalCorrect: 11,
      totalIncorrect: 7,
      totalSessions: 3
    });
    expect(session).toMatchObject({
      id: 'session-1',
      mode: 'random',
      score: 8,
      total: 10
    });
    expect(stat).toMatchObject({
      questionId: 'q-4',
      questionNumber: 12,
      editorialExplanation: 'Idea corta',
      incorrectAttempts: 4,
      lastIncorrectAt: null
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
      total: '20'
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
        { error_type: 'negacion', label: 'Negaciones', count: 4 }
      ]
    });

    expect(session.mode).toBe('mixed');
    expect(dashboard).toMatchObject({
      totalQuestions: 120,
      seenQuestions: 40,
      recommendedMode: 'mixed',
      recommendedTodayCount: 26,
      dailyReviewCapacity: 35
    });
    expect(dashboard?.riskBreakdown).toEqual([
      { errorType: 'plazo', label: 'Plazos', count: 6 },
      { errorType: 'negacion', label: 'Negaciones', count: 4 }
    ]);
  });

  it('convierte el objetivo de examen al contrato de frontend', () => {
    const examTarget = mapExamTarget({
      user_id: 'user-1',
      curriculum: 'general',
      exam_date: '2026-06-30',
      daily_review_capacity: '30',
      daily_new_capacity: '8',
      updated_at: '2026-03-27T19:00:00Z'
    });

    expect(examTarget).toMatchObject({
      userId: 'user-1',
      curriculum: 'general',
      examDate: '2026-06-30',
      dailyReviewCapacity: 30,
      dailyNewCapacity: 8
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
      pressure_message: 'Tu rendimiento cae 13 puntos bajo presion.'
    });

    expect(insights).toMatchObject({
      learningAccuracy: 0.81,
      simulacroAccuracy: 0.68,
      pressureGap: 0.13,
      recommendedMode: 'anti_trap'
    });
  });
});
