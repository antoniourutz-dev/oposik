import { describe, expect, it } from 'vitest';
import {
  attemptDedupKey,
  dedupeAttemptsStable,
  normalizeAnsweredAtForKey,
  partitionAttemptsByExistingKeys,
} from '../../../supabase/functions/_shared/syncAttemptDeduplication';

const base = (overrides: Partial<{ question_id: string; answered_at: string; n: number }>) => ({
  question_id: 'q1',
  answered_at: '2026-03-31T12:00:00.000Z',
  n: 1,
  ...overrides,
});

describe('syncAttemptDeduplication', () => {
  it('normaliza answered_at equivalentes a la misma clave', () => {
    const a = normalizeAnsweredAtForKey('2026-03-31T12:00:00.000Z');
    const b = normalizeAnsweredAtForKey('2026-03-31T13:00:00.000+01:00');
    expect(a).toBe(b);
    expect(attemptDedupKey('q1', '2026-03-31T12:00:00.000Z')).toBe(
      attemptDedupKey('q1', '2026-03-31T13:00:00.000+01:00'),
    );
  });

  it('dedupeAttemptsStable: misma pregunta y tiempo → última ocurrencia, orden estable', () => {
    const attempts = [
      { ...base({ n: 1 }), is_correct: false },
      { ...base({ n: 2 }), is_correct: true },
    ];
    const out = dedupeAttemptsStable(attempts);
    expect(out).toHaveLength(1);
    expect(out[0].n).toBe(2);
  });

  it('dedupeAttemptsStable: dos preguntas distintas se conservan', () => {
    const attempts = [
      { ...base({ question_id: 'q1' }) },
      { ...base({ question_id: 'q2' }) },
    ];
    expect(dedupeAttemptsStable(attempts)).toHaveLength(2);
  });

  it('partitionAttemptsByExistingKeys: pendientes vs duplicados respecto al backend', () => {
    const attempts = [base({ question_id: 'a' }), base({ question_id: 'b' })];
    const existing = new Set([attemptDedupKey('a', attempts[0].answered_at)]);
    const { pending, duplicateIgnored } = partitionAttemptsByExistingKeys(attempts, existing);
    expect(pending).toHaveLength(1);
    expect(pending[0].question_id).toBe('b');
    expect(duplicateIgnored).toBe(1);
  });

  it('mismo payload dos veces: segunda pasada sería todo duplicado', () => {
    const attempts = [base({}), base({ question_id: 'q2' })];
    const keys = new Set(attempts.map((a) => attemptDedupKey(a.question_id, a.answered_at)));
    const second = partitionAttemptsByExistingKeys(attempts, keys);
    expect(second.pending).toHaveLength(0);
    expect(second.duplicateIgnored).toBe(2);
  });
});
