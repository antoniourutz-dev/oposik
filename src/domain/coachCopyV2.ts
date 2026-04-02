import type { SurfaceDominantState } from '../adapters/surfaces/surfaceTypes';
import type { CoachPlanV2 } from './learningEngine/coachV2';
import type { CoachTwoLineMessage } from './learningEngine';

export function buildCoachTwoLineMessageV2(input: {
  planV2: CoachPlanV2;
  dominantState: SurfaceDominantState;
}): CoachTwoLineMessage {
  const { dominantState } = input;

  const mk = (line1: string, line2: string): CoachTwoLineMessage => ({
    line1,
    line2,
    text: `${line1} ${line2}`.replace(/\s+/g, ' ').trim(),
  });

  switch (dominantState) {
    case 'backlog':
      return mk('Tienes preguntas vencidas', 'Hoy va mejor consolidar antes de seguir.');
    case 'errors':
      return mk('Estás repitiendo errores', 'Corrige el patrón antes de avanzar.');
    case 'pressure':
      return mk('Hoy toca entrenar examen', 'Tu nivel cae cuando sube la presión.');
    case 'recovery':
      return mk('Vuelve a entrar fácil', 'Una sesión corta hoy ya cambia la dinámica.');
    case 'growth':
      return mk('Estás listo para subir', 'Tu base aguanta; hoy puedes exigir más.');
    case 'memory':
      return mk('Hoy toca afinar', 'Vamos a lo seguro para fijar lo importante.');
    default:
      return mk('Hoy toca afinar', 'Vamos a lo seguro para generar señal.');
  }
}

