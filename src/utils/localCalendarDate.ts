/**
 * Clave YYYY-MM-DD en calendario **local** (no UTC).
 * Usar para rachas y agrupar por día; evita desfases con `toISOString()` en zonas != UTC.
 */
export function toLocalDateKey(d: Date): string {
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Día local a medianoche (para iterar “hoy”, “ayer”, …). */
export function startOfLocalDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

/**
 * Rachas por días consecutivos con al menos una sesión cerrada (`finishedAt`).
 */
export function computeConsecutiveDayStreak(
  finishedAtIsoStrings: Array<string | null | undefined>,
): number {
  const finishedKeys = new Set(
    finishedAtIsoStrings
      .map((iso) => {
        const d = new Date(String(iso ?? ''));
        if (Number.isNaN(d.getTime())) return null;
        return toLocalDateKey(d);
      })
      .filter((v): v is string => Boolean(v)),
  );

  const today = startOfLocalDay(new Date());
  let streak = 0;
  for (;;) {
    const d = new Date(today);
    d.setDate(today.getDate() - streak);
    const key = toLocalDateKey(d);
    if (!finishedKeys.has(key)) break;
    streak += 1;
  }
  return streak;
}
