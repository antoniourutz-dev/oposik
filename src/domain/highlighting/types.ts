/**
 * Resaltado orientado a decisión para textos legales/administrativos (oposiciones), ES.
 * Fase 1: heurísticas puras, sin NLP externo.
 */

export type HighlightIntent =
  | 'differentiator'
  | 'core_decision'
  | 'legal_anchor'
  | 'negation_or_exception'
  | 'deadline_or_quantity';

export type HighlightConfidence = 'low' | 'medium' | 'high';

export type HighlightSpan = {
  start: number;
  end: number;
  /** Puntuación ponderada (aprox. 0–100). */
  score: number;
  intent: HighlightIntent;
};

export type HighlightResult = {
  spans: HighlightSpan[];
  confidence: HighlightConfidence;
};

export type HighlightContentRole = 'question' | 'answer_option' | 'explanation';

export type BuildSmartHighlightsInput = {
  text: string;
  /** Pregunta vs opción vs explicación: limita recuentos y umbral. */
  contentRole?: HighlightContentRole;
  /** Todas las opciones (mismo orden que en el test) para diferenciadores. */
  allOptions?: readonly string[];
  /** Índice de `text` dentro de `allOptions` cuando se analiza una opción. */
  optionIndex?: number;
};
