/**
 * Claves de idempotencia para sync-practice-session (Edge + tests Vitest).
 * Misma clave = mismo intento lógico: (question_id, answered_at normalizado).
 */

export function normalizeAnsweredAtForKey(answeredAt: string): string {
  const trimmed = answeredAt.trim();
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return trimmed;
  return new Date(ms).toISOString();
}

/** Clave estable para comparar payload con filas existentes en question_attempt_events. */
export function attemptDedupKey(questionId: string, answeredAt: string): string {
  return `${questionId}\u0000${normalizeAnsweredAtForKey(answeredAt)}`;
}

/**
 * En un mismo payload, conserva la última ocurrencia por (question_id, answered_at normalizado)
 * y mantiene el orden de primera aparición de cada clave.
 */
export function dedupeAttemptsStable<T extends { question_id: string; answered_at: string }>(attempts: T[]): T[] {
  const lastByKey = new Map<string, T>();
  for (const a of attempts) {
    lastByKey.set(attemptDedupKey(a.question_id, a.answered_at), a);
  }
  const out: T[] = [];
  const done = new Set<string>();
  for (const a of attempts) {
    const k = attemptDedupKey(a.question_id, a.answered_at);
    if (done.has(k)) continue;
    done.add(k);
    const last = lastByKey.get(k);
    if (last) out.push(last);
  }
  return out;
}

export function partitionAttemptsByExistingKeys<T extends { question_id: string; answered_at: string }>(
  attempts: T[],
  existingKeys: ReadonlySet<string>,
): { pending: T[]; duplicateIgnored: number } {
  const pending: T[] = [];
  let duplicateIgnored = 0;
  for (const a of attempts) {
    const k = attemptDedupKey(a.question_id, a.answered_at);
    if (existingKeys.has(k)) {
      duplicateIgnored += 1;
    } else {
      pending.push(a);
    }
  }
  return { pending, duplicateIgnored };
}
