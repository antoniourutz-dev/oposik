import { afterEach, describe, expect, it, vi } from 'vitest';
import {
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
      incorrectAttempts: 4,
      lastIncorrectAt: null
    });
  });
});
