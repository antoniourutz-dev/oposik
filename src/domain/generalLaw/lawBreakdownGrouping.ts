import type { PracticeLawBlockPerformance, PracticeLawPerformance } from '../../practiceTypes';

/** Título de tarjeta en Estudio (leyes generales) — texto fijo acordado en producto. */
const STUDY_CARD_TITLE_LEY_39_2015 = 'Ley 39/2015, Procedimiento Administrativo Común';
const STUDY_CARD_TITLE_CONSTITUCION = 'Constitución Española';
/** Ley Orgánica 3/1979 — Estatuto de Autonomía del País Vasco. */
const STUDY_CARD_TITLE_ESTATUTO_PAIS_VASCO = 'Estatuto de Autonomía del País Vasco';

/**
 * Título mostrado en la tarjeta de Estudio para cada norma (LPACAP, CE, u otras desde catálogo).
 */
export function resolveStudyLawCardTitle(law: PracticeLawPerformance): string {
  const key = canonicalLawGroupKey(law);
  if (key === 'norm:ley:39/2015') return STUDY_CARD_TITLE_LEY_39_2015;
  if (key === 'norm:constitucion_espanola') return STUDY_CARD_TITLE_CONSTITUCION;
  if (key === 'norm:ley:3/1979') return STUDY_CARD_TITLE_ESTATUTO_PAIS_VASCO;

  const inferred = inferNormTitleFromLawFields(law);
  if (inferred) return inferred;

  return law.shortTitle?.trim() || law.ley_referencia;
}

/** Cuando solo hay `lawId`, deducir LPACAP / CE por textos de referencia o título corto. */
function inferNormTitleFromLawFields(law: PracticeLawPerformance): string | null {
  const blob = `${law.shortTitle ?? ''} ${law.ley_referencia}`.trim();
  if (!blob) return null;
  const lower = blob.toLowerCase();

  if (
    /\bconstituci[oó]n\s+espa[ñn]ola\b/i.test(blob) ||
    (/\b(?:c\.?\s*e\.?|ce)\b/i.test(lower) && /\b1978\b/.test(blob))
  ) {
    return STUDY_CARD_TITLE_CONSTITUCION;
  }

  const m = blob.match(/\b(\d{1,4})\s*\/\s*(\d{4})\b/);
  if (m?.[1] === '3' && m?.[2] === '1979') {
    return STUDY_CARD_TITLE_ESTATUTO_PAIS_VASCO;
  }
  if (m?.[1] === '39' && m?.[2] === '2015') {
    return STUDY_CARD_TITLE_LEY_39_2015;
  }

  if (/\bestatuto\b/i.test(blob) && /\bpa[ií]s\s+vasco\b/i.test(blob)) {
    return STUDY_CARD_TITLE_ESTATUTO_PAIS_VASCO;
  }

  return null;
}

/** Texto que se refiere al Estatuto de Autonomía del País Vasco (LO 3/1979) sin depender solo del número. */
function isEstatutoAutonomiaPaisVascoReference(ref: string): boolean {
  if (/\blo\s*3\s*\/\s*1979\b/i.test(ref) || /\bley\s+org[aá]nica\s+3\s*\/\s*1979\b/i.test(ref)) {
    return true;
  }
  if (/\bestatuto\b/i.test(ref) && /\bpa[ií]s\s+vasco\b/i.test(ref)) {
    return true;
  }
  return false;
}

/**
 * Normaliza una cadena de referencia (o título + referencia) a la misma clave que el dashboard
 * usa sin `lawId` — sirve para emparejar preguntas del catálogo con una ley agrupada.
 */
export function canonicalLawGroupKeyFromText(text: string): string {
  const ref = text.trim();
  if (!ref) return 'raw:';
  const lower = ref.toLowerCase();

  if (
    /\bconstituci[oó]n\s+espa[ñn]ola\b/i.test(ref) ||
    (/\b(?:c\.?\s*e\.?|ce)\b/i.test(lower) && /\b1978\b/.test(ref))
  ) {
    return 'norm:constitucion_espanola';
  }

  if (isEstatutoAutonomiaPaisVascoReference(ref)) {
    return 'norm:ley:3/1979';
  }

  const m = ref.match(/\b(\d{1,4})\s*\/\s*(\d{4})\b/);
  if (m) {
    return `norm:ley:${m[1]}/${m[2]}`;
  }

  return `raw:${lower}`;
}

export function canonicalLawGroupKeyFromLeyReferencia(leyReferencia: string | null | undefined): string {
  return canonicalLawGroupKeyFromText(String(leyReferencia ?? ''));
}

/**
 * Clave para filtrar el catálogo de preguntas por ley (ignora `lawId`: las preguntas solo traen texto).
 */
export function catalogMatchKeyForLaw(law: PracticeLawPerformance): string {
  const blob = `${law.shortTitle ?? ''} ${law.ley_referencia}`.trim();
  return canonicalLawGroupKeyFromText(blob || law.ley_referencia);
}

/**
 * Clave estable para agrupar filas del dashboard que corresponden a la misma norma
 * (p. ej. distintas cadenas en `ley_referencia` para la misma ley).
 */
export function canonicalLawGroupKey(law: PracticeLawPerformance): string {
  const id = law.lawId?.trim();
  if (id) return `lawId:${id}`;

  return canonicalLawGroupKeyFromText(law.ley_referencia);
}

const mergeAccuracy = (attempts: number, correctAttempts: number) =>
  attempts <= 0 ? 0 : Math.round((correctAttempts / attempts) * 10000) / 10000;

function mergeBlockMaps(
  groups: PracticeLawBlockPerformance[][],
): PracticeLawBlockPerformance[] | undefined {
  const map = new Map<string, PracticeLawBlockPerformance>();

  for (const blocks of groups) {
    for (const b of blocks ?? []) {
      const id = b.blockId.trim() || b.title;
      const cur = map.get(id);
      if (!cur) {
        map.set(id, { ...b });
        continue;
      }
      const attempts = cur.attempts + b.attempts;
      const correctAttempts = cur.correctAttempts + b.correctAttempts;
      map.set(id, {
        ...cur,
        questionCount: (cur.questionCount ?? 0) + (b.questionCount ?? 0),
        consolidatedCount: (cur.consolidatedCount ?? 0) + (b.consolidatedCount ?? 0),
        attempts,
        correctAttempts,
        accuracyRate: mergeAccuracy(attempts, correctAttempts),
      });
    }
  }

  if (map.size === 0) return undefined;
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
}

function pickLongestShortTitle(laws: PracticeLawPerformance[]): string | null {
  let best: string | null = null;
  for (const law of laws) {
    const s = law.shortTitle?.trim();
    if (!s) continue;
    if (!best || s.length > best.length) best = s;
  }
  return best;
}

/** Referencia usada por `get_law_practice_batch` (coincidencia exacta con filas del catálogo). */
function pickCanonicalLeyReferencia(laws: PracticeLawPerformance[]): string {
  const sorted = [...laws].sort(
    (a, b) => (b.questionCount ?? 0) - (a.questionCount ?? 0),
  );
  return sorted[0]!.ley_referencia.trim();
}

function mergeLawGroup(laws: PracticeLawPerformance[]): PracticeLawPerformance {
  const canonical = [...laws].sort(
    (a, b) => (b.questionCount ?? 0) - (a.questionCount ?? 0),
  )[0]!;

  const totalQuestions = laws.reduce((acc, l) => acc + (l.questionCount ?? 0), 0);
  const consolidatedCount = laws.reduce((acc, l) => acc + (l.consolidatedCount ?? 0), 0);
  const attempts = laws.reduce((acc, l) => acc + l.attempts, 0);
  const correctAttempts = laws.reduce((acc, l) => acc + l.correctAttempts, 0);

  const lawIds = new Set(laws.map((l) => l.lawId).filter(Boolean) as string[]);
  const lawId = lawIds.size === 1 ? [...lawIds][0] : undefined;

  const trainingIntent =
    laws.map((l) => l.trainingIntent?.trim()).find((s) => s && s.length > 0) ?? null;

  const shortTitle = pickLongestShortTitle(laws);
  const ley_referencia = pickCanonicalLeyReferencia(laws);

  const blockGroups = laws.map((l) => l.blocks ?? []).filter((b) => b.length > 0);
  const blocks = blockGroups.length > 0 ? mergeBlockMaps(blockGroups) : undefined;

  return {
    ley_referencia,
    ...(lawId ? { lawId } : {}),
    shortTitle: shortTitle ?? canonical.shortTitle,
    trainingIntent: trainingIntent ?? canonical.trainingIntent,
    blocks,
    scope: canonical.scope,
    attempts,
    questionCount: totalQuestions,
    consolidatedCount,
    correctAttempts,
    accuracyRate: mergeAccuracy(attempts, correctAttempts),
  };
}

/**
 * Agrupa filas de `law_breakdown` por norma (misma ley u organismo) y suma métricas.
 * Así la pestaña Estudio muestra una tarjeta por ley real aunque el API devuelva varias filas.
 */
export function mergeLawBreakdownRows(laws: PracticeLawPerformance[]): PracticeLawPerformance[] {
  if (laws.length <= 1) return laws;

  const byKey = new Map<string, PracticeLawPerformance[]>();
  for (const law of laws) {
    const key = canonicalLawGroupKey(law);
    const list = byKey.get(key);
    if (list) list.push(law);
    else byKey.set(key, [law]);
  }

  const merged: PracticeLawPerformance[] = [];
  for (const group of byKey.values()) {
    merged.push(group.length === 1 ? group[0]! : mergeLawGroup(group));
  }

  return merged;
}
