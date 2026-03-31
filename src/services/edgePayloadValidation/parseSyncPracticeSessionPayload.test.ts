import { describe, expect, it } from 'vitest';
import { parseSyncPracticeSessionPayload } from '../../../supabase/functions/_shared/syncPracticePayload';

describe('parseSyncPracticeSessionPayload', () => {
  it('rechaza payload no objeto', () => {
    const result = parseSyncPracticeSessionPayload(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_PAYLOAD');
      expect(result.status).toBe(400);
    }
  });

  it('rechaza session inválida', () => {
    const result = parseSyncPracticeSessionPayload({ attempts: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('rechaza attempts no array', () => {
    const result = parseSyncPracticeSessionPayload({
      session: { id: 's1', startedAt: '2026-01-01T00:00:00.000Z' },
      attempts: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('rechaza attempts demasiado grande', () => {
    const attempts = Array.from({ length: 3 }, () => ({
      question_id: 'q1',
      answered_at: '2026-01-01T00:00:00.000Z',
      is_correct: true,
      correct_option: 'a',
      selected_option: 'a',
    }));
    const result = parseSyncPracticeSessionPayload(
      {
        session: { id: 's1', startedAt: '2026-01-01T00:00:00.000Z' },
        attempts,
      },
      { maxAttempts: 2 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('PAYLOAD_TOO_LARGE');
      expect(result.status).toBe(413);
    }
  });

  it('acepta payload válido mínimo y normaliza curriculum', () => {
    const result = parseSyncPracticeSessionPayload({
      session: {
        id: 's1',
        startedAt: '2026-01-01T00:00:00.000Z',
      },
      attempts: [
        {
          question_id: 'q1',
          answered_at: '2026-01-01T00:00:00.000Z',
          is_correct: false,
          correct_option: 'b',
          selected_option: 'a',
          changed_answer: 1,
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.curriculum).toBe('general');
      expect(result.value.session.id).toBe('s1');
      expect(result.value.attempts).toHaveLength(1);
      expect(result.value.attempts[0].question_id).toBe('q1');
      expect(result.value.attempts[0].changed_answer).toBe(true);
    }
  });
});

