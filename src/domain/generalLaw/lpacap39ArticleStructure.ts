import type { PracticeQuestion } from '../../practiceTypes';

/** Tramo de la Ley 39/2015 (LPACAP) para agrupar preguntas por título / capítulo. */
export type Lpacap39Section = {
  /** Texto del título (sin emoji; el UI añade 🔹). */
  titulo: string;
  /** Subtítulo de capítulo, o null si el tramo va solo bajo el título. */
  capitulo: string | null;
  articleFrom: number;
  articleTo: number;
};

/**
 * Estructura oficial por artículos (orden lectura). Debe cubrir 1–133 sin solapes incorrectos.
 */
export const LPACAP_39_2015_SECTIONS: Lpacap39Section[] = [
  { titulo: 'TÍTULO PRELIMINAR. Disposiciones generales', capitulo: null, articleFrom: 1, articleTo: 2 },
  {
    titulo: 'TÍTULO I. De los interesados en el procedimiento',
    capitulo: null,
    articleFrom: 3,
    articleTo: 12,
  },
  {
    titulo: 'TÍTULO II. De la actividad de las Administraciones Públicas',
    capitulo: 'Capítulo I. Normas generales de actuación',
    articleFrom: 13,
    articleTo: 28,
  },
  {
    titulo: 'TÍTULO II. De la actividad de las Administraciones Públicas',
    capitulo: 'Capítulo II. Términos y plazos',
    articleFrom: 29,
    articleTo: 33,
  },
  {
    titulo: 'TÍTULO III. De los actos administrativos',
    capitulo: 'Capítulo I. Requisitos de los actos administrativos',
    articleFrom: 34,
    articleTo: 36,
  },
  {
    titulo: 'TÍTULO III. De los actos administrativos',
    capitulo: 'Capítulo II. Eficacia de los actos',
    articleFrom: 37,
    articleTo: 46,
  },
  {
    titulo: 'TÍTULO III. De los actos administrativos',
    capitulo: 'Capítulo III. Nulidad y anulabilidad',
    articleFrom: 47,
    articleTo: 52,
  },
  {
    titulo: 'TÍTULO IV. De las disposiciones sobre el procedimiento administrativo común',
    capitulo: 'Capítulo I. Garantías del procedimiento',
    articleFrom: 53,
    articleTo: 55,
  },
  {
    titulo: 'TÍTULO IV. De las disposiciones sobre el procedimiento administrativo común',
    capitulo: 'Capítulo II. Iniciación del procedimiento',
    articleFrom: 56,
    articleTo: 69,
  },
  {
    titulo: 'TÍTULO IV. De las disposiciones sobre el procedimiento administrativo común',
    capitulo: 'Capítulo III. Ordenación del procedimiento',
    articleFrom: 70,
    articleTo: 74,
  },
  {
    titulo: 'TÍTULO IV. De las disposiciones sobre el procedimiento administrativo común',
    capitulo: 'Capítulo IV. Instrucción del procedimiento',
    articleFrom: 75,
    articleTo: 83,
  },
  {
    titulo: 'TÍTULO IV. De las disposiciones sobre el procedimiento administrativo común',
    capitulo: 'Capítulo V. Finalización del procedimiento',
    articleFrom: 84,
    articleTo: 92,
  },
  {
    titulo: 'TÍTULO IV. De las disposiciones sobre el procedimiento administrativo común',
    capitulo: 'Capítulo VI. Ejecución',
    articleFrom: 93,
    articleTo: 105,
  },
  {
    titulo: 'TÍTULO V. De la revisión de los actos en vía administrativa',
    capitulo: 'Capítulo I. Revisión de oficio',
    articleFrom: 106,
    articleTo: 111,
  },
  {
    titulo: 'TÍTULO V. De la revisión de los actos en vía administrativa',
    capitulo: 'Capítulo II. Recursos administrativos',
    articleFrom: 112,
    articleTo: 126,
  },
  {
    titulo: 'TÍTULO VI. De la iniciativa legislativa y de la potestad reglamentaria',
    capitulo: null,
    articleFrom: 127,
    articleTo: 133,
  },
];

export function findLpacap39SectionForArticle(article: number): Lpacap39Section | null {
  if (!Number.isFinite(article)) return null;
  const n = Math.trunc(article);
  return LPACAP_39_2015_SECTIONS.find((s) => n >= s.articleFrom && n <= s.articleTo) ?? null;
}

const TEXT_FIELDS = (q: PracticeQuestion) =>
  [
    q.statement,
    q.explanation,
    q.editorialExplanation,
    q.topicLabel,
    q.category,
  ]
    .filter(Boolean)
    .join(' \n ');

/**
 * Intenta obtener el número de artículo de la LPACAP citado en la pregunta (1–133).
 */
export function extractLpacapArticleNumber(q: PracticeQuestion): number | null {
  const blob = TEXT_FIELDS(q);
  const candidates: number[] = [];

  const reArt = /\bart(?:[íi]culo)?s?\s+(?:n[.º°\s]*)?(\d{1,3})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = reArt.exec(blob)) !== null) {
    const v = Number.parseInt(m[1] ?? '', 10);
    if (v >= 1 && v <= 133) candidates.push(v);
  }

  const reArts = /\b(?:arts?\.?)\s*(\d{1,3})\b/gi;
  while ((m = reArts.exec(blob)) !== null) {
    const v = Number.parseInt(m[1] ?? '', 10);
    if (v >= 1 && v <= 133) candidates.push(v);
  }

  if (candidates.length > 0) {
    return Math.min(...candidates);
  }

  const num = q.number;
  if (num != null && num >= 1 && num <= 133) {
    return num;
  }

  return null;
}

export function shouldGroupLpacap39ByTitles(lawMatchKey: string): boolean {
  return lawMatchKey === 'norm:ley:39/2015';
}

function sortByArticleAndId(a: PracticeQuestion, b: PracticeQuestion): number {
  const na = extractLpacapArticleNumber(a) ?? 999;
  const nb = extractLpacapArticleNumber(b) ?? 999;
  if (na !== nb) return na - nb;
  const nNum = (a.number ?? 0) - (b.number ?? 0);
  if (nNum !== 0) return nNum;
  return a.id.localeCompare(b.id, 'es');
}

export function sectionIdentity(sec: Lpacap39Section): string {
  return `${sec.articleFrom}:${sec.articleTo}:${sec.capitulo ?? ''}:${sec.titulo}`;
}

/** Resuelve un tramo por la clave estable (p. ej. al volver del detalle). `unclassified` no tiene fila en la ley. */
export function findLpacap39SectionByIdentity(key: string): Lpacap39Section | null {
  if (key === 'unclassified') return null;
  return LPACAP_39_2015_SECTIONS.find((s) => sectionIdentity(s) === key) ?? null;
}

export function filterQuestionsInLpacap39Section(
  questions: PracticeQuestion[],
  section: Lpacap39Section,
): PracticeQuestion[] {
  return questions
    .filter((q) => {
      const art = extractLpacapArticleNumber(q);
      if (art == null) return false;
      const s = findLpacap39SectionForArticle(art);
      return s != null && sectionIdentity(s) === sectionIdentity(section);
    })
    .sort(sortByArticleAndId);
}

export function filterUnclassifiedLpacap39Questions(questions: PracticeQuestion[]): PracticeQuestion[] {
  return questions
    .filter((q) => {
      const art = extractLpacapArticleNumber(q);
      if (art == null) return true;
      return findLpacap39SectionForArticle(art) == null;
    })
    .sort(sortByArticleAndId);
}

/** Títulos de la LPACAP fusionando capítulos (rango de artículos continuo por título). */
export function getLpacap39MergedTitles(): {
  titulo: string;
  articleFrom: number;
  articleTo: number;
}[] {
  const seen = new Set<string>();
  const out: { titulo: string; articleFrom: number; articleTo: number }[] = [];
  for (const s of LPACAP_39_2015_SECTIONS) {
    if (seen.has(s.titulo)) continue;
    seen.add(s.titulo);
    const parts = LPACAP_39_2015_SECTIONS.filter((x) => x.titulo === s.titulo);
    const articleFrom = Math.min(...parts.map((p) => p.articleFrom));
    const articleTo = Math.max(...parts.map((p) => p.articleTo));
    out.push({ titulo: s.titulo, articleFrom, articleTo });
  }
  return out;
}

export function countQuestionsPerLpacap39Title(
  questions: PracticeQuestion[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const q of questions) {
    const art = extractLpacapArticleNumber(q);
    if (art == null) continue;
    const sec = findLpacap39SectionForArticle(art);
    if (!sec) continue;
    counts.set(sec.titulo, (counts.get(sec.titulo) ?? 0) + 1);
  }
  return counts;
}

/** Preguntas cuyo artículo pertenece a cualquier capítulo de ese TÍTULO. */
export function filterQuestionsForLpacap39Title(
  questions: PracticeQuestion[],
  titulo: string,
): PracticeQuestion[] {
  return questions
    .filter((q) => {
      const art = extractLpacapArticleNumber(q);
      if (art == null) return false;
      const sec = findLpacap39SectionForArticle(art);
      return sec != null && sec.titulo === titulo;
    })
    .sort(sortByArticleAndId);
}

/**
 * Orden: títulos/capítulos según ley, luego preguntas sin artículo identificable al final.
 */
export function groupQuestionsByLpacap39Sections(questions: PracticeQuestion[]): {
  section: Lpacap39Section | null;
  questions: PracticeQuestion[];
}[] {
  const buckets = new Map<
    string,
    { section: Lpacap39Section | null; items: PracticeQuestion[] }
  >();

  const touch = (id: string, section: Lpacap39Section | null) => {
    if (!buckets.has(id)) {
      buckets.set(id, { section, items: [] });
    }
    return buckets.get(id)!;
  };

  for (const q of questions) {
    const art = extractLpacapArticleNumber(q);
    const sec = art != null ? findLpacap39SectionForArticle(art) : null;
    if (sec) {
      touch(sectionIdentity(sec), sec).items.push(q);
    } else {
      touch('unclassified', null).items.push(q);
    }
  }

  const ordered: { section: Lpacap39Section | null; questions: PracticeQuestion[] }[] = [];
  for (const sec of LPACAP_39_2015_SECTIONS) {
    const b = buckets.get(sectionIdentity(sec));
    if (b?.items.length) {
      b.items.sort(sortByArticleAndId);
      ordered.push({ section: sec, questions: b.items });
    }
  }
  const u = buckets.get('unclassified');
  if (u?.items.length) {
    u.items.sort(sortByArticleAndId);
    ordered.push({ section: null, questions: u.items });
  }

  return ordered;
}

/** Líneas de cabecera (primera con 🔹 solo al cambiar de título). */
export function formatLpacap39SectionLines(
  sec: Lpacap39Section,
  previous: Lpacap39Section | null,
): string[] {
  const lines: string[] = [];
  const showTitulo = !previous || previous.titulo !== sec.titulo;
  if (showTitulo) {
    lines.push(`🔹 ${sec.titulo}`);
  }
  if (sec.capitulo) {
    lines.push(sec.capitulo);
  }
  lines.push(`Artículos: ${sec.articleFrom}–${sec.articleTo}`);
  return lines;
}
