import { PracticeMode } from './practiceTypes';

export type SessionPresentation = {
  eyebrow: string;
  compactLabel: string;
};

export const getSessionPresentation = (mode: PracticeMode): SessionPresentation => {
  switch (mode) {
    case 'mixed':
      return {
        eyebrow: 'Ruta adaptativa',
        compactLabel: 'Mixto'
      };
    case 'anti_trap':
      return {
        eyebrow: 'Entrenamiento fino',
        compactLabel: 'Anti-trampas'
      };
    case 'random':
      return {
        eyebrow: 'Recuperacion libre',
        compactLabel: 'Aleatorio'
      };
    case 'weakest':
    case 'review':
      return {
        eyebrow: 'Repaso critico',
        compactLabel: 'Falladas'
      };
    case 'simulacro':
      return {
        eyebrow: 'Examen real',
        compactLabel: 'Simulacro'
      };
    case 'standard':
    default:
      return {
        eyebrow: 'Ruta principal',
        compactLabel: 'Bloque'
      };
  }
};
