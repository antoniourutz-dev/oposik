import type { ErrorType } from '../domain/learningEngine/types';

const ERROR_TYPE_VALUES = [
  'concepto',
  'literalidad',
  'plazo',
  'organo_competente',
  'procedimiento',
  'excepcion',
  'negacion',
  'distractor_cercano',
  'lectura_rapida',
  'sobreconfianza',
  'confusion_entre_normas',
  'memoria_fragil',
] as const;

const normalizeExternalErrorTypeKey = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    // La API puede venir con espacios o guiones: normalizamos a '_' para poder validar keys.
    .replace(/[-\s]+/g, '_');

export const mapExternalErrorType = (value: unknown): ErrorType | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;

  const normalized = normalizeExternalErrorTypeKey(value);
  if (!normalized) return null;

  return (ERROR_TYPE_VALUES as readonly string[]).includes(normalized)
    ? (normalized as ErrorType)
    : null;
};
