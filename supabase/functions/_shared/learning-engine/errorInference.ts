import { ErrorType } from './types.ts';

const normalizeText = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const tokenize = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9áéíóúüñ/ ]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);

const hasNumber = (value: string) => /\d/.test(value);

const optionSimilarity = (left: string, right: string) => {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) overlap += 1;
  });

  return overlap / Math.max(leftTokens.size, rightTokens.size);
};

export const getErrorTypeLabel = (errorType: ErrorType | null | undefined) => {
  switch (errorType) {
    case 'concepto':
      return 'Concepto';
    case 'literalidad':
      return 'Literalidad';
    case 'plazo':
      return 'Plazo';
    case 'organo_competente':
      return 'Organo competente';
    case 'procedimiento':
      return 'Procedimiento';
    case 'excepcion':
      return 'Excepcion';
    case 'negacion':
      return 'Negacion';
    case 'distractor_cercano':
      return 'Distractor cercano';
    case 'lectura_rapida':
      return 'Lectura rapida';
    case 'sobreconfianza':
      return 'Sobreconfianza';
    case 'confusion_entre_normas':
      return 'Confusion entre normas';
    case 'memoria_fragil':
      return 'Memoria fragil';
    default:
      return null;
  }
};

export const inferTrapTags = ({
  statement,
  correctOptionText,
  selectedOptionText
}: {
  statement: string;
  correctOptionText: string;
  selectedOptionText?: string | null;
}) => {
  const normalizedStatement = normalizeText(statement);
  const normalizedCorrect = normalizeText(correctOptionText);
  const normalizedSelected = normalizeText(selectedOptionText ?? '');
  const combined = `${normalizedStatement} ${normalizedCorrect} ${normalizedSelected}`;
  const tags = new Set<string>();

  if (/\b(excepto|salvo|menos)\b/.test(normalizedStatement)) {
    tags.add('EXCEPTO');
  }

  if (/\b(no|nunca|falso|incorrecta?|erronea?)\b/.test(normalizedStatement)) {
    tags.add('NEGACION');
  }

  if (
    /\b(dias?|meses?|anos?|horas?|minutos?|semanas?|habiles?|naturales?)\b/.test(combined) ||
    hasNumber(combined)
  ) {
    tags.add('PLAZO');
  }

  if (
    /\b(consejo|director|ministro|departamento|autoridad|comision|tribunal|organo|gerencia)\b/.test(
      combined
    )
  ) {
    tags.add('ORGANO');
  }

  if (/\b(ley|decreto|real decreto|orden|norma|articulo)\b/.test(combined) && /\d+\/\d+/.test(combined)) {
    tags.add('NORMA');
  }

  return Array.from(tags);
};

export const computeErrorPenalty = (errorType: ErrorType | null | undefined) => {
  switch (errorType) {
    case 'plazo':
    case 'excepcion':
    case 'negacion':
      return 0.12;
    case 'lectura_rapida':
    case 'sobreconfianza':
      return 0.1;
    case 'literalidad':
    case 'distractor_cercano':
      return 0.08;
    case 'organo_competente':
    case 'confusion_entre_normas':
      return 0.09;
    default:
      return 0.04;
  }
};

export const resolveDominantErrorType = ({
  previousDominantErrorType,
  currentErrorType,
  isCorrect
}: {
  previousDominantErrorType: ErrorType | null;
  currentErrorType: ErrorType | null | undefined;
  isCorrect: boolean;
}): ErrorType | null => {
  if (isCorrect) return previousDominantErrorType;
  return currentErrorType ?? previousDominantErrorType ?? 'memoria_fragil';
};

export const inferAttemptErrorType = ({
  statement,
  selectedOptionText,
  correctOptionText,
  responseTimeMs,
  isCorrect
}: {
  statement: string;
  selectedOptionText: string | null;
  correctOptionText: string;
  responseTimeMs: number | null;
  isCorrect: boolean;
}): ErrorType | null => {
  if (isCorrect) return null;

  const tags = inferTrapTags({
    statement,
    correctOptionText,
    selectedOptionText
  });
  const similarity = selectedOptionText
    ? optionSimilarity(selectedOptionText, correctOptionText)
    : 0;

  if (responseTimeMs !== null && responseTimeMs <= 2200) {
    return 'sobreconfianza';
  }

  if (responseTimeMs !== null && responseTimeMs <= 4200) {
    return 'lectura_rapida';
  }

  if (tags.includes('EXCEPTO')) return 'excepcion';
  if (tags.includes('NEGACION')) return 'negacion';
  if (tags.includes('PLAZO')) return 'plazo';
  if (tags.includes('ORGANO')) return 'organo_competente';
  if (tags.includes('NORMA')) return 'confusion_entre_normas';

  if (
    selectedOptionText &&
    hasNumber(selectedOptionText) &&
    hasNumber(correctOptionText) &&
    similarity >= 0.45
  ) {
    return 'literalidad';
  }

  if (similarity >= 0.72) {
    return 'distractor_cercano';
  }

  return 'memoria_fragil';
};
