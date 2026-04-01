import { PracticeMode } from './practiceTypes';

export type SessionPresentation = {
  eyebrow: string;
  compactLabel: string;
};

/** Copy para quiz: sin jerga técnica (Mixto, Ruta adaptativa, etc.). */
export type QuizFriendlyCopy = {
  /** Junto a “Práctica”: contexto humano en mayúsculas pequeñas */
  sessionKindLabel: string;
  /** Línea encima de “Pregunta X de Y” */
  contextLine1: string;
};

export const getQuizFriendlyCopy = (mode: PracticeMode): QuizFriendlyCopy => {
  switch (mode) {
    case 'weakest':
    case 'review':
      return {
        sessionKindLabel: 'Repasando falladas',
        contextLine1: 'Corrigiendo errores clave',
      };
    case 'mixed':
      return {
        sessionKindLabel: 'Sesión guiada',
        contextLine1: 'Siguiendo tu plan de hoy',
      };
    case 'random':
      return {
        sessionKindLabel: 'Práctica libre',
        contextLine1: 'Mezclando temas para fijar ideas',
      };
    case 'simulacro':
      return {
        sessionKindLabel: 'Simulacro',
        contextLine1: 'Entrenando bajo presión',
      };
    case 'anti_trap':
      return {
        sessionKindLabel: 'Lectura fina',
        contextLine1: 'Evitando trampas habituales',
      };
    case 'catalog_review':
      return {
        sessionKindLabel: 'Análisis del banco',
        contextLine1: 'Lectura completa del temario',
      };
    case 'standard':
    default:
      return {
        sessionKindLabel: 'Práctica',
        contextLine1: 'Avanzando paso a paso',
      };
  }
};

export const getSessionPresentation = (mode: PracticeMode): SessionPresentation => {
  switch (mode) {
    case 'mixed':
      return {
        eyebrow: 'Ruta adaptativa',
        compactLabel: 'Mixto',
      };
    case 'anti_trap':
      return {
        eyebrow: 'Entrenamiento fino',
        compactLabel: 'Anti-trampas',
      };
    case 'random':
      return {
        eyebrow: 'Recuperacion libre',
        compactLabel: 'Aleatorio',
      };
    case 'weakest':
    case 'review':
      return {
        eyebrow: 'Repaso critico',
        compactLabel: 'Falladas',
      };
    case 'simulacro':
      return {
        eyebrow: 'Examen real',
        compactLabel: 'Simulacro',
      };
    case 'catalog_review':
      return {
        eyebrow: 'Análisis',
        compactLabel: 'Banco',
      };
    case 'standard':
    default:
      return {
        eyebrow: 'Ruta principal',
        compactLabel: 'Bloque',
      };
  }
};
