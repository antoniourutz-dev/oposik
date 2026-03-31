export type ExplanationBlockTone = 'basis' | 'trap' | 'detail';

export type ExplanationBlock = {
  tone: ExplanationBlockTone;
  title: string;
  text: string;
};

export type ExplanationPresentation = {
  lead: string;
  blocks: ExplanationBlock[];
};

const LEGAL_MARKER =
  /\b(articulo|ley|decreto|reglamento|normativa|estatuto|constitucion|real decreto)\b/i;
const TRAP_MARKER =
  /\b(por que\b|por qué\b|opcion(?:es)?\s+[a-d]|\bl[ao]s?\s+opciones?\b|\bincorrectas?\b)\b/i;

const normalizeText = (value: string) =>
  value
    .replace(/\r?\n+/g, ' ')
    .replace(/([.!?])(?=[A-ZÁÉÍÓÚÑ])/g, '$1 ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .replace(/\s+([)\]}])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

const stripCorrectAnswerLead = (value: string) => {
  const stripped = value.replace(
    /^(?:la\s+)?(?:respuesta|opcion)\s+correcta\s+es(?:\s+(?:la|el))?\s+[^.?!]*[.?!]\s*/i,
    '',
  );

  return stripped || value;
};

const splitSentences = (value: string) =>
  value
    .replace(/\s+(?=Por qu[eé]\b)/gi, '\n')
    .replace(/:\s+(?=Opcion(?:es)?\s+[a-d])/gi, ':\n')
    .split(/\n+/)
    .flatMap((part) => part.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/u))
    .map((part) => part.trim())
    .filter(Boolean);

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const deriveLeadFromLegalSentence = (value: string) => {
  if (
    /^(?:De acuerdo con|Segun|Según|Conforme a|En virtud de)\b/i.test(value) &&
    value.includes(',')
  ) {
    const anchorPatterns = [
      ', tanto ',
      ', el ',
      ', la ',
      ', los ',
      ', las ',
      ', debe ',
      ', deben ',
      ', se ',
    ];

    for (const anchor of anchorPatterns) {
      const index = value.toLowerCase().indexOf(anchor);
      if (index !== -1) {
        const anchoredTail = value.slice(index + 2).trim();
        if (anchoredTail.length >= 24) {
          return capitalize(anchoredTail);
        }
      }
    }

    const tail = value.slice(value.lastIndexOf(',') + 1).trim();
    if (tail.length >= 24) {
      return capitalize(tail);
    }
  }

  const statementMatch = value.match(
    /(?:establece|dispone|senala|señala|indica|recoge)\s+que\s+(.+)/i,
  );
  if (statementMatch && statementMatch[1].trim().length >= 24) {
    return capitalize(statementMatch[1].trim());
  }

  return null;
};

const cleanTrapSentence = (value: string) =>
  value
    .replace(/^Por qu[eé][^:]*:\s*/i, '')
    .replace(/^Las otras opciones[^:]*:\s*/i, '')
    .trim();

const joinSentences = (sentences: string[]) => sentences.join(' ').trim();

export const buildExplanationPresentation = (
  rawExplanation: string | null,
): ExplanationPresentation | null => {
  if (!rawExplanation) return null;

  const normalized = stripCorrectAnswerLead(normalizeText(rawExplanation));
  if (!normalized) return null;

  const sentences = splitSentences(normalized);
  if (!sentences.length) {
    return {
      lead: normalized,
      blocks: [],
    };
  }

  const legalSentences: string[] = [];
  const trapSentences: string[] = [];
  const detailSentences: string[] = [];
  let derivedLead: string | null = null;

  sentences.forEach((sentence) => {
    if (TRAP_MARKER.test(sentence)) {
      trapSentences.push(cleanTrapSentence(sentence));
      return;
    }

    if (LEGAL_MARKER.test(sentence)) {
      derivedLead ||= deriveLeadFromLegalSentence(sentence);
      legalSentences.push(sentence);
      return;
    }

    detailSentences.push(sentence);
  });

  const leadParts: string[] = [];
  if (derivedLead) {
    leadParts.push(derivedLead);
  }

  while (leadParts.length < 2 && detailSentences.length > 0) {
    const nextSentence = detailSentences.shift();
    if (nextSentence) {
      leadParts.push(nextSentence);
    }
  }

  if (!leadParts.length && legalSentences.length > 0) {
    const fallbackLegalLead = legalSentences.shift();
    if (fallbackLegalLead) {
      leadParts.push(fallbackLegalLead);
    }
  }

  const blocks: ExplanationBlock[] = [];

  if (detailSentences.length > 0) {
    blocks.push({
      tone: 'detail',
      title: 'Detalle util',
      text: joinSentences(detailSentences),
    });
  }

  if (legalSentences.length > 0) {
    blocks.push({
      tone: 'basis',
      title: 'Apoyo legal',
      text: joinSentences(legalSentences),
    });
  }

  if (trapSentences.length > 0) {
    blocks.push({
      tone: 'trap',
      title: 'Donde estaba la trampa',
      text: joinSentences(trapSentences),
    });
  }

  return {
    lead: joinSentences(leadParts) || normalized,
    blocks,
  };
};
