import { INTENT_WEIGHT, SPANISH_STOPWORDS, WEAK_GENERIC_TOKENS } from './highlightPatterns';
import { normalizeToken } from './spanUtils';
import type { HighlightCandidate } from './spanUtils';

type Tok = { start: number; end: number; norm: string };

const WORD_RE = /[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)?/gu;

function tokenizeWords(text: string): Tok[] {
  const out: Tok[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    const raw = m[0];
    if (raw === undefined || m.index === undefined) continue;
    const start = m.index;
    const end = start + raw.length;
    const norm = normalizeToken(raw);
    if (norm.length >= 1) {
      out.push({ start, end, norm });
    }
  }
  return out;
}

function normAt(tokens: Tok[], p: number): string {
  if (p < tokens.length) return tokens[p]!.norm;
  return '__END__';
}

/**
 * Cuenta en cuántas opciones aparece cada token normalizado (una vez por opción).
 */
function optionPresenceCounts(options: readonly string[]): Map<string, number> {
  const perOptionSets = options.map((opt) => {
    const tokens = tokenizeWords(opt);
    const seen = new Set<string>();
    for (const t of tokens) {
      if (t.norm.length >= 2 && !SPANISH_STOPWORDS.has(t.norm)) {
        seen.add(t.norm);
      }
    }
    return seen;
  });

  const counts = new Map<string, number>();
  for (const set of perOptionSets) {
    for (const norm of set) {
      counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }
  }
  return counts;
}

const MAX_DIFF_SPAN_CHARS = 130;

/**
 * Si la región alineada es demasiado larga, recorta a rachas de tokens que solo aparecen en esta opción.
 */
function shrinkToUniqueRuns(
  text: string,
  tokens: Tok[],
  presence: Map<string, number>,
  globalL: number,
  globalR: number,
): HighlightCandidate | null {
  const slice = tokens.slice(globalL, globalR + 1).filter((t) => t.norm.length >= 2);
  const runs: { start: number; end: number; score: number }[] = [];
  let runStart: number | null = null;
  let runEnd: number | null = null;

  for (const t of slice) {
    const appearsOnce = (presence.get(t.norm) ?? 0) === 1;
    if (appearsOnce) {
      if (runStart === null) {
        runStart = t.start;
        runEnd = t.end;
      } else {
        runEnd = t.end;
      }
    } else if (runStart !== null && runEnd !== null) {
      runs.push({
        start: runStart,
        end: runEnd,
        score: INTENT_WEIGHT.differentiator * 0.94,
      });
      runStart = null;
      runEnd = null;
    }
  }
  if (runStart !== null && runEnd !== null) {
    runs.push({
      start: runStart,
      end: runEnd,
      score: INTENT_WEIGHT.differentiator * 0.94,
    });
  }

  if (runs.length === 0) return null;

  // Preferir la racha más larga en términos de información (score * sqrt length)
  runs.sort((a, b) => b.score * Math.sqrt(b.end - b.start) - a.score * Math.sqrt(a.end - a.start));
  const best = runs[0]!;
  if (text.slice(best.start, best.end).length > MAX_DIFF_SPAN_CHARS) return null;
  return {
    start: best.start,
    end: best.end,
    intent: 'differentiator',
    score: Math.round(best.score * 100) / 100,
  };
}

/**
 * Compara opciones hermanas (texto normalizado por tokens alineados) y devuelve
 * un span por opción centrado en lo que cambia el significado.
 */
export function compareAnswerOptions(options: readonly string[]): HighlightCandidate[][] {
  if (options.length <= 1) {
    return options.map(() => []);
  }

  const tokenized = options.map((o) => tokenizeWords(o));
  const maxLen = Math.max(...tokenized.map((t) => t.length), 0);
  if (maxLen === 0) {
    return options.map(() => []);
  }

  let L = -1;
  let R = -1;
  for (let p = 0; p < maxLen; p++) {
    const norms = options.map((_, i) => normAt(tokenized[i]!, p));
    const diff = norms.some((n) => n !== norms[0]);
    if (diff) {
      if (L === -1) L = p;
      R = p;
    }
  }

  if (L === -1) {
    return options.map(() => []);
  }

  /** Incluir contexto compartido inmediatamente antes del primer desacuerdo ("intereses generales" vs "intereses particulares"). */
  let effL = L;
  while (effL > 0) {
    const normsAtPrev = options.map((_, i) => normAt(tokenized[i]!, effL - 1));
    if (!normsAtPrev.every((n) => n === normsAtPrev[0])) break;
    effL -= 1;
  }
  L = effL;

  const presence = optionPresenceCounts(options);
  const result: HighlightCandidate[][] = options.map(() => []);

  options.forEach((text, idx) => {
    const tokens = tokenized[idx]!;
    if (tokens.length === 0) return;

    const li = Math.min(L, Math.max(0, tokens.length - 1));
    const ri = Math.min(R, Math.max(0, tokens.length - 1));
    let start = tokens[li]!.start;
    let end = tokens[ri]!.end;

    if (L >= tokens.length && tokens.length > 0) {
      const last = tokens[tokens.length - 1]!;
      start = last.start;
      end = last.end;
    }

    if (end <= start) return;

    const spanLen = end - start;
    let candidate: HighlightCandidate = {
      start,
      end,
      intent: 'differentiator',
      score: Math.round(INTENT_WEIGHT.differentiator * (spanLen > 80 ? 0.82 : 0.94) * 100) / 100,
    };

    if (spanLen > MAX_DIFF_SPAN_CHARS) {
      const shrunk = shrinkToUniqueRuns(text, tokens, presence, li, ri);
      if (shrunk) {
        candidate = shrunk;
      } else {
        return;
      }
    }

    const fragment = text.slice(candidate.start, candidate.end).trim();
    if (fragment.length < 3) return;
    const firstWord = fragment.split(/\s+/)[0];
    if (firstWord && WEAK_GENERIC_TOKENS.has(normalizeToken(firstWord)) && fragment.split(/\s+/).length === 1) {
      return;
    }

    result[idx]!.push(candidate);
  });

  return result;
}
