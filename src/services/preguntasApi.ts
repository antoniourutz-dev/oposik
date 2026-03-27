import { supabase } from '../supabase';
import { OptionKey, PracticeQuestion } from '../practiceTypes';

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

const OPTION_FIELD_ALIASES: Record<OptionKey, string[]> = {
  a: ['opcion_a', 'option_a', 'respuesta_a', 'a'],
  b: ['opcion_b', 'option_b', 'respuesta_b', 'b'],
  c: ['opcion_c', 'option_c', 'respuesta_c', 'c'],
  d: ['opcion_d', 'option_d', 'respuesta_d', 'd']
};

const readText = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const readNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  const normalized = readText(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const normalizeComparable = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const pickFirstText = (row: Record<string, unknown>, fieldNames: string[]) => {
  for (const fieldName of fieldNames) {
    const value = readText(row[fieldName]);
    if (value) return value;
  }

  return null;
};

const extractOptionsFromObject = (rawOptions: unknown) => {
  if (!rawOptions || typeof rawOptions !== 'object' || Array.isArray(rawOptions)) {
    return null;
  }

  const source = rawOptions as Record<string, unknown>;
  const entries = OPTION_KEYS.map((key) => [key, readText(source[key])] as const);
  if (entries.some(([, value]) => !value)) {
    return null;
  }

  return Object.fromEntries(entries) as Record<OptionKey, string>;
};

const extractOptions = (row: Record<string, unknown>) => {
  const nestedOptions =
    extractOptionsFromObject(row.opciones) ??
    extractOptionsFromObject(row.options);

  if (nestedOptions) {
    return nestedOptions;
  }

  const entries = OPTION_KEYS.map((key) => [
    key,
    pickFirstText(row, OPTION_FIELD_ALIASES[key])
  ] as const);

  if (entries.some(([, value]) => !value)) {
    return null;
  }

  return Object.fromEntries(entries) as Record<OptionKey, string>;
};

const mapNumericOption = (value: number): OptionKey | null => {
  const index = Math.trunc(value) - 1;
  return OPTION_KEYS[index] ?? null;
};

const extractCorrectOption = (
  row: Record<string, unknown>,
  options: Record<OptionKey, string>
): OptionKey | null => {
  const rawCorrectValue =
    row.respuesta_correcta ??
    row.correct_option ??
    row.correct_answer ??
    row.respuesta ??
    row.answer;

  if (typeof rawCorrectValue === 'number' && Number.isFinite(rawCorrectValue)) {
    return mapNumericOption(rawCorrectValue);
  }

  const correctText = readText(rawCorrectValue);
  if (!correctText) {
    return null;
  }

  const normalizedCorrect = normalizeComparable(correctText);
  if (OPTION_KEYS.includes(normalizedCorrect as OptionKey)) {
    return normalizedCorrect as OptionKey;
  }

  const numericCandidate = Number(correctText);
  if (Number.isFinite(numericCandidate)) {
    return mapNumericOption(numericCandidate);
  }

  return (
    OPTION_KEYS.find((key) => normalizeComparable(options[key]) === normalizedCorrect) ?? null
  );
};

const mapQuestion = (row: Record<string, unknown>): PracticeQuestion | null => {
  const statement = pickFirstText(row, ['pregunta', 'question_text', 'enunciado', 'texto', 'question']);
  const options = extractOptions(row);

  if (!statement || !options) {
    return null;
  }

  const correctOption = extractCorrectOption(row, options);
  if (!correctOption) {
    return null;
  }

  return {
    id: readText(row.id) ?? crypto.randomUUID(),
    number: readNumber(row.numero ?? row.question_number ?? row.orden ?? row.order),
    statement,
    options,
    correctOption,
    category: pickFirstText(row, ['grupo', 'tipo', 'type', 'category', 'tema']),
    explanation: pickFirstText(row, ['explicacion', 'explanation', 'justificacion'])
  };
};

export const getPracticeQuestions = async () => {
  const runQuery = (orderField: string | null) => {
    let query = supabase.from('preguntas').select('*').limit(1000);

    if (orderField) {
      query = query.order(orderField, { ascending: true });
    }

    return query;
  };

  let response = await runQuery('numero');

  if (response.error && /column .*numero/i.test(response.error.message)) {
    response = await runQuery('id');
  }

  if (response.error && /column .*id/i.test(response.error.message)) {
    response = await runQuery(null);
  }

  if (response.error) {
    throw response.error;
  }

  return ((response.data ?? []) as Array<Record<string, unknown>>)
    .map(mapQuestion)
    .filter((question): question is PracticeQuestion => Boolean(question));
};
