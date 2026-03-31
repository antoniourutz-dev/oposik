import {
  PracticeQuestion,
  PracticeQuestionScope,
  PracticeQuestionScopeFilter,
} from '../practiceTypes';

const normalizeScopeToken = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const normalizeQuestionScope = (value: unknown): PracticeQuestionScope | null => {
  const normalized = normalizeScopeToken(value);

  if (!normalized) return null;
  if (normalized === 'comun' || normalized === 'common' || normalized === 'troncal') {
    return 'common';
  }

  if (normalized === 'especifico' || normalized === 'specific' || normalized === 'especialidad') {
    return 'specific';
  }

  return null;
};

export const readQuestionScopeFromRow = (
  row: Record<string, unknown>,
): PracticeQuestionScope | null => {
  const candidates = [
    row.grupo,
    row.question_scope,
    row.scope,
    row.scope_key,
    row.temario_tipo,
    row.tipo_temario,
    row.question_track,
    row.track,
    row.tipo,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeQuestionScope(candidate);
    if (normalized) return normalized;
  }

  return null;
};

export const matchesQuestionScope = (
  question: Pick<PracticeQuestion, 'questionScope'>,
  filter: PracticeQuestionScopeFilter,
) => filter === 'all' || question.questionScope === filter;

export const filterQuestionsByScope = (
  questions: PracticeQuestion[],
  filter: PracticeQuestionScopeFilter,
) =>
  filter === 'all'
    ? questions
    : questions.filter((question) => matchesQuestionScope(question, filter));

export const getQuestionScopeLabel = (
  value: PracticeQuestionScopeFilter | PracticeQuestionScope | null | undefined,
) => {
  switch (value) {
    case 'common':
      return 'Comun';
    case 'specific':
      return 'Especifico';
    case 'all':
    default:
      return 'Ambas';
  }
};

export const getQuestionScopeHint = (value: PracticeQuestionScopeFilter) => {
  switch (value) {
    case 'common':
      return 'temario comun';
    case 'specific':
      return 'temario especifico';
    case 'all':
    default:
      return 'todo el temario';
  }
};
