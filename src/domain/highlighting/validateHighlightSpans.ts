import {
  HIGHLIGHT_CATEGORIES,
  type HighlightBlockType,
  type HighlightSpan,
} from './highlightTypes';

const MAX_SPANS_BY_BLOCK: Record<HighlightBlockType, number> = {
  question: 5,
  answer: 3,
  explanation: 3,
};

const VALID_CATEGORIES = new Set(HIGHLIGHT_CATEGORIES);

export function validateHighlightSpans(params: {
  text: string;
  spans: HighlightSpan[];
  blockType: HighlightBlockType;
}): { valid: boolean; errors: string[] } {
  const { text, spans, blockType } = params;
  const errors: string[] = [];
  const sorted = [...spans].sort((left, right) => left.start - right.start);

  if (sorted.length > MAX_SPANS_BY_BLOCK[blockType]) {
    errors.push(
      `El bloque ${blockType} admite como maximo ${MAX_SPANS_BY_BLOCK[blockType]} highlights.`,
    );
  }

  sorted.forEach((span, index) => {
    if (!Number.isInteger(span.start) || span.start < 0) {
      errors.push(`Span ${index + 1}: start debe ser un entero >= 0.`);
    }

    if (!Number.isInteger(span.end) || span.end <= span.start) {
      errors.push(`Span ${index + 1}: end debe ser mayor que start.`);
    }

    if (span.end > text.length) {
      errors.push(`Span ${index + 1}: end no puede superar la longitud del texto.`);
    }

    if (!Number.isFinite(span.score) || span.score < 0) {
      errors.push(`Span ${index + 1}: score debe ser un numero finito >= 0.`);
    }

    if (!VALID_CATEGORIES.has(span.category)) {
      errors.push(`Span ${index + 1}: categoria no valida.`);
    }

    if (span.colorToken && !VALID_CATEGORIES.has(span.colorToken)) {
      errors.push(`Span ${index + 1}: colorToken no valido.`);
    }
  });

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    if (current.start < previous.end) {
      errors.push('Los highlights no pueden solaparse.');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
