/**
 * Patrones para heurísticas de resaltado (español jurídico/administrativo).
 * Prioridad de intención: ver pesos en INTENT_WEIGHT.
 */

import type { HighlightIntent } from './types';

export const INTENT_WEIGHT: Record<HighlightIntent, number> = {
  differentiator: 100,
  core_decision: 90,
  negation_or_exception: 80,
  deadline_or_quantity: 70,
  legal_anchor: 60,
};

/** Orden de prioridad al empatar (índice menor = más importante). */
export const INTENT_PRIORITY: Record<HighlightIntent, number> = {
  differentiator: 0,
  core_decision: 1,
  negation_or_exception: 2,
  deadline_or_quantity: 3,
  legal_anchor: 4,
};

export type PatternDef = {
  id: string;
  regex: RegExp;
  intent: HighlightIntent;
  /** Fuerza relativa del match (0–1); se multiplica por INTENT_WEIGHT. */
  strength: number;
};

const RX = {
  leyNum: /\b(?:Ley\s+(?:Org[aá]nica\s+)?(?:\d+\/\d{4})|Ley\s+\d+\/\d{4})\b/gi,
  realDecreto:
    /\b(?:R\.?D\.?|Real\s+Decreto(?:\s+Legislativo)?)\s*(?:\d+\/\d{4}(?:\s*,\s*de\s+\d+\s+de\s+\w+)?)?\b/gi,
  decreto: /\bDecreto\s+(?:\d+\/\d{4}|ley\s+\d+\/\d{4})?\b/gi,
  orden: /\bOrden\s+(?:[A-Z]{2,8}\/\d+\/\d{4}|ministerial\s+\w+)?\b/gi,
  articulo:
    /\b(?:art(?:[íi]culo)?s?\.?\s*\d+(?:\s*(?:y|o|,)\s*\d+)?|arts?\.?\s*\d+)\b/gi,
  boe: /\b(?:BOE|DOGV|DOUE|BOCM|BOP|DOG)\b(?:\s*,\s*\d+\s+de\s+\w+)?/gi,
  plazo:
    /\b\d{1,4}\s*(?:d[ií]as?|mes(?:es)?|a[nñ]os?|horas?|minutos?|semanas?)\b/gi,
  porcentaje: /\b\d{1,3}(?:[.,]\d+)?\s*%/g,
  euros: /\b\d{1,9}(?:[.,]\d{3})*(?:[.,]\d{2})?\s*(?:€|eur(?:os)?)\b/gi,
  fecha: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  negacion:
    /\b(?:no\s+(?:es|son|habr[áa]|podr[áa]|deber[áa]|procede|constituye)|nunca|jam[áa]s|tampoco|ni\s+(?:mucho\s+menos|siquiera))\b/gi,
  excepcion:
    /\b(?:salvo|excepto|excepci[oó]n|siempre\s+que|a\s+excepci[oó]n\s+de|con\s+la\s+salvedad)\b/gi,
  unicidad: /\b(?:[uú]nicamente|exclusivamente|tan\s+solo|s[oó]lo)\b/gi,
};

/** Referencias normativas: solo cuando anclan (ley, RD, art., BOE). */
export const LEGAL_ANCHOR_PATTERNS: PatternDef[] = [
  { id: 'ley', regex: RX.leyNum, intent: 'legal_anchor', strength: 0.95 },
  { id: 'rd', regex: RX.realDecreto, intent: 'legal_anchor', strength: 0.92 },
  { id: 'articulo', regex: RX.articulo, intent: 'legal_anchor', strength: 0.88 },
  { id: 'decreto', regex: RX.decreto, intent: 'legal_anchor', strength: 0.72 },
  { id: 'orden', regex: RX.orden, intent: 'legal_anchor', strength: 0.68 },
  { id: 'boe', regex: RX.boe, intent: 'legal_anchor', strength: 0.65 },
];

/** Plazos, cantidades, fechas concretas. */
export const DEADLINE_QUANTITY_PATTERNS: PatternDef[] = [
  { id: 'plazo', regex: RX.plazo, intent: 'deadline_or_quantity', strength: 0.92 },
  { id: 'porcentaje', regex: RX.porcentaje, intent: 'deadline_or_quantity', strength: 0.88 },
  { id: 'euros', regex: RX.euros, intent: 'deadline_or_quantity', strength: 0.82 },
  { id: 'fecha', regex: RX.fecha, intent: 'deadline_or_quantity', strength: 0.78 },
];

/** Negación y excepción (misma intención unificada). */
export const NEGATION_EXCEPTION_PATTERNS: PatternDef[] = [
  { id: 'negacion', regex: RX.negacion, intent: 'negation_or_exception', strength: 0.94 },
  { id: 'excepcion', regex: RX.excepcion, intent: 'negation_or_exception', strength: 0.9 },
  { id: 'unicidad', regex: RX.unicidad, intent: 'negation_or_exception', strength: 0.72 },
];

/**
 * Frases que suelen contener la decisión jurídica (evitar trocear en palabras sueltas).
 */
export const CORE_DECISION_PATTERNS: PatternDef[] = [
  {
    id: 'riesgo_grave',
    regex: /\briesgo\s+grave\s+e\s+inminente\b/gi,
    intent: 'core_decision',
    strength: 0.98,
  },
  {
    id: 'delegados_prevencion',
    regex: /\bdelegados\s+de\s+prevenci[oó]n\b/gi,
    intent: 'core_decision',
    strength: 0.95,
  },
  {
    id: 'copia_autenticada',
    regex: /\bcopia\s+autenticada\b/gi,
    intent: 'core_decision',
    strength: 0.93,
  },
  {
    id: 'documento_original',
    regex: /\bdocumento\s+original\b/gi,
    intent: 'core_decision',
    strength: 0.93,
  },
  {
    id: 'comite_salud',
    regex: /\b(?:Comit[eé]|comit[eé])\s+de\s+Seguridad\s+y\s+Salud\b/gi,
    intent: 'core_decision',
    strength: 0.9,
  },
  {
    id: 'servicio_prevencion',
    regex: /\bServicio\s+de\s+Prevenci[oó]n\b/gi,
    intent: 'core_decision',
    strength: 0.88,
  },
  {
    id: 'mayoria',
    regex: /\b(?:mayor[ií]a\s+(?:absoluta|simple|calificada))\b/gi,
    intent: 'core_decision',
    strength: 0.86,
  },
  {
    id: 'intereses_gp',
    regex: /\bintereses\s+(?:generales|particulares|p[úu]blicos)\b/gi,
    intent: 'core_decision',
    strength: 0.9,
  },
];

export const SPANISH_STOPWORDS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'y',
  'o',
  'pero',
  'de',
  'del',
  'al',
  'a',
  'en',
  'por',
  'para',
  'con',
  'sin',
  'sobre',
  'entre',
  'que',
  'cual',
  'como',
  'cuando',
  'donde',
  'si',
  'según',
  'segun',
  'mediante',
  'conforme',
  'este',
  'esta',
  'estos',
  'estas',
  'ese',
  'esa',
  'eso',
  'ser',
  'es',
  'son',
  'fue',
  'han',
  'ha',
  'habrá',
  'habra',
  'se',
  'su',
  'sus',
  'le',
  'les',
  'lo',
]);

/**
 * Verbos / términos genéricos que no deben resaltarse solos (penalización fuerte).
 */
export const WEAK_GENERIC_TOKENS = new Set([
  'consideren',
  'considera',
  'considerar',
  'existe',
  'existen',
  'realizado',
  'realizar',
  'realizada',
  'obtener',
  'obtenga',
  'presentar',
  'presente',
  'conocer',
  'conocen',
  'debe',
  'deben',
  'deberá',
  'deberán',
  'puede',
  'pueden',
  'podrá',
  'podrán',
  'habrá',
  'tendrá',
  'tendrán',
  'haber',
  'tener',
  'hacer',
  'cumplir',
  'solicitar',
  'informar',
]);
