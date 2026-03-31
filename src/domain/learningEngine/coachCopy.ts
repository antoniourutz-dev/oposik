import type { PracticeCoachPlan } from '../../practiceTypes';

type CoachCopyInput = {
  mode: PracticeCoachPlan['mode'];
  tone: PracticeCoachPlan['tone'];
  focusMessage?: string | null;
  reasons?: string[] | null;
  summary?: string | null;
};

export type CoachTwoLineMessage = {
  /** Línea 1: qué pasa (simple) */
  line1: string;
  /** Línea 2: qué conviene hacer (implícito) */
  line2: string;
  /** Texto listo para UI si necesitas una sola cadena */
  text: string;
};

const normalize = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/[“”"]/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

const stripNumbersAndMetrics = (value: string) =>
  value
    // números, porcentajes, puntos, etc.
    .replace(/\b\d+([.,]\d+)?\b/g, '')
    .replace(/%/g, '')
    .replace(/\bpts?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const simplifyTerms = (value: string) => {
  const v = ` ${value.toLowerCase()} `;
  return normalize(
    v
      .replace(/\breadiness\b/g, 'preparación')
      .replace(/\bbacklog\b/g, 'repasos')
      .replace(/\btransferencia\b/g, 'nivel real')
      .replace(/\bdiscriminaci[oó]n\b/g, 'claridad')
      .replace(/\bliteralidad\b/g, 'lectura')
      .replace(/\bdistractores?\b/g, 'opciones parecidas')
      .replace(/\bconviene\b/g, 'hoy va mejor')
      .replace(/\bdeber[ií]as\b/g, '')
      .replace(/\boptimizar\b/g, 'afinar')
      .replace(/\brendimiento\b/g, 'acierto')
      .replace(/\bcapacidad diaria\b/g, 'tu ritmo')
      .replace(/\bseñal\b/g, 'pista')
      .trim(),
  );
};

const takeFirstSentence = (value: string) => {
  const trimmed = normalize(value);
  const cut = trimmed.split(/[.!?]\s/)[0] ?? trimmed;
  return normalize(cut);
};

const toWords = (value: string) =>
  normalize(value)
    .split(' ')
    .map((w) => w.trim())
    .filter(Boolean);

const clampWords = (value: string, maxWords = 14) => {
  const words = toWords(value);
  if (words.length <= maxWords) return normalize(value);
  return normalize(words.slice(0, maxWords).join(' '));
};

const finalizeCoachLine = (value: string) => {
  const v = normalize(value).replace(/\.+$/, '').trim();
  if (!v) return '';
  return v.charAt(0).toUpperCase() + v.slice(1);
};

const detectTheme = (input: CoachCopyInput) => {
  const raw = [
    input.focusMessage ?? '',
    ...(input.reasons ?? []),
    input.summary ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const t = simplifyTerms(stripNumbersAndMetrics(raw));

  if (input.mode === 'simulacro' || /\bsimulacro\b/.test(t) || /\bnivel real\b/.test(t)) {
    return { kind: 'simulacro', text: t };
  }
  if (input.mode === 'anti_trap' || /\btramp|plazos|excepciones|negaciones\b/.test(t)) {
    return { kind: 'anti_trap', text: t };
  }
  if (/\bvenc|urgentes|repasos\b/.test(t) && /\bdemasiad|much|acumul\b/.test(t)) {
    return { kind: 'backlog', text: t };
  }
  if (/\blectura\b/.test(t) && /\bpresi[oó]n\b/.test(t)) {
    return { kind: 'pressure', text: t };
  }
  if (/\bconsolid|repas\b/.test(t)) {
    return { kind: 'consolidate', text: t };
  }
  if (/\bnuevas?\b/.test(t)) {
    return { kind: 'advance', text: t };
  }
  return { kind: 'generic', text: t };
};

const templates = (kind: string): CoachTwoLineMessage => {
  switch (kind) {
    case 'simulacro':
      return {
        line1: 'La base está lista para medirte.',
        line2: 'Hoy va mejor un simulacro completo.',
        text: 'La base está lista para medirte.\nHoy va mejor un simulacro completo.',
      };
    case 'anti_trap':
      return {
        line1: 'Te penalizan detalles de lectura.',
        line2: 'Hoy va mejor afinar plazos y excepciones.',
        text: 'Te penalizan detalles de lectura.\nHoy va mejor afinar plazos y excepciones.',
      };
    case 'backlog':
      return {
        line1: 'Se acumulan repasos urgentes.',
        line2: 'Hoy va mejor consolidar sin saturarte.',
        text: 'Se acumulan repasos urgentes.\nHoy va mejor consolidar sin saturarte.',
      };
    case 'pressure':
      return {
        line1: 'En presión cuesta mantener el acierto.',
        line2: 'Hoy va mejor bajar ritmo y leer fino.',
        text: 'En presión cuesta mantener el acierto.\nHoy va mejor bajar ritmo y leer fino.',
      };
    case 'advance':
      return {
        line1: 'La base aguanta bien.',
        line2: 'Hoy va mejor abrir nuevas con calma.',
        text: 'La base aguanta bien.\nHoy va mejor abrir nuevas con calma.',
      };
    case 'consolidate':
      return {
        line1: 'Hay repaso rentable por delante.',
        line2: 'Hoy va mejor mezclar y consolidar.',
        text: 'Hay repaso rentable por delante.\nHoy va mejor mezclar y consolidar.',
      };
    default:
      return {
        line1: 'Tienes una ruta clara.',
        line2: 'Hoy va mejor seguir el plan recomendado.',
        text: 'Tienes una ruta clara.\nHoy va mejor seguir el plan recomendado.',
      };
  }
};

/**
 * Transforma el contenido del learning engine (focusMessage/reasons/summary) en un coach
 * de **2 líneas**, cotidiano y accionable.
 *
 * Principios:
 * - baja carga cognitiva (frases cortas)
 * - dirección sin mandato (sin “deberías”)
 * - concreción sin métricas
 * - seguridad (sin juicio)
 */
export const toCoachTwoLineMessage = (input: CoachCopyInput): CoachTwoLineMessage => {
  const theme = detectTheme(input);

  // Si el motor ya trae una frase muy buena, la usamos como línea 1 y completamos con plantilla.
  const candidateRaw = input.focusMessage ?? input.reasons?.[0] ?? input.summary ?? '';
  const candidate = clampWords(
    simplifyTerms(stripNumbersAndMetrics(takeFirstSentence(candidateRaw || ''))),
    14,
  );

  const base = templates(theme.kind);

  const line1Raw =
    candidate && candidate.length >= 12 && candidate.split(' ').length <= 14
      ? candidate.endsWith('.') ? candidate : `${candidate}.`
      : base.line1;

  const line1 = finalizeCoachLine(line1Raw);
  const line2 = finalizeCoachLine(clampWords(base.line2, 14));

  return {
    line1,
    line2,
    text: `${line1}\n${line2}`,
  };
};

