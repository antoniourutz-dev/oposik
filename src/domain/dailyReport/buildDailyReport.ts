import type { PracticeCategoryRiskSummary, PracticeMode, PracticeSessionSummary } from '../../practiceTypes';
import type { DailyReport, DailyReportDayType, DailyReportInsightSeverity } from './types';
import { toLocalDateKey } from '../../utils/localCalendarDate';
import { getSessionDurationsSecondsForStats } from '../../utils/practiceSessionTiming';

const MODE_LABEL: Record<PracticeMode, string> = {
  standard: 'Consolidacion',
  quick_five: 'Continuidad breve',
  weakest: 'Repaso de fallos',
  random: 'Variedad',
  review: 'Repaso',
  mixed: 'Mixta',
  simulacro: 'Simulacro',
  anti_trap: 'Anti trampas',
  catalog_review: 'Lectura de catalogo',
};

/** Día civil local de cierre de sesión (alineado con el calendario de estudio). */
function sessionFinishedLocalDayKey(iso: string | null | undefined): string {
  const date = new Date(String(iso ?? ''));
  if (Number.isNaN(date.getTime())) return '';
  return toLocalDateKey(date);
}

function sessionDurationSec(session: PracticeSessionSummary): number {
  return getSessionDurationsSecondsForStats([session])[0] ?? 0;
}

function dominantMode(sessions: PracticeSessionSummary[]): PracticeMode {
  const counts = new Map<PracticeMode, number>();
  sessions.forEach((session) => {
    counts.set(session.mode, (counts.get(session.mode) ?? 0) + session.total);
  });

  let best: PracticeMode = sessions[0]!.mode;
  let max = -1;
  counts.forEach((count, mode) => {
    if (count > max) {
      max = count;
      best = mode;
    }
  });
  return best;
}

function classifyDay(
  sessions: PracticeSessionSummary[],
  accuracy: number,
  totalQuestions: number,
  hasPressure: boolean,
): DailyReportDayType {
  if (totalQuestions === 0) return 'recovery';
  const incorrectRatio = 1 - accuracy;
  if (hasPressure && accuracy < 0.62) return 'pressure';
  if (incorrectRatio >= 0.42 && totalQuestions >= 6) return 'pattern';
  if (accuracy >= 0.78 && totalQuestions >= 12) return 'growth';
  if (totalQuestions <= 8 && sessions.length <= 2 && accuracy >= 0.5) return 'recovery';
  return 'consolidation';
}

function insightFor(
  type: DailyReportDayType,
  accuracy: number,
  totalQuestions: number,
  hasPressure: boolean,
): {
  title: string;
  summary: string;
  severity: DailyReportInsightSeverity;
  badge: DailyReport['primaryInsight']['badge'];
} {
  const pct = Math.round(accuracy * 100);
  switch (type) {
    case 'pressure':
      return {
        title: hasPressure ? 'La exigencia marco el ritmo' : 'Dia intenso',
        summary:
          accuracy < 0.65
            ? `Con ${pct}% de acierto, conviene revisar lectura fina antes de sumar volumen.`
            : `Mantuviste un ${pct}% aceptable pese al contexto exigente.`,
        severity: accuracy < 0.55 ? 'high' : 'medium',
        badge: accuracy < 0.62 ? 'alerta' : 'estable',
      };
    case 'pattern':
      return {
        title: 'Se repetia el mismo tipo de fallo',
        summary:
          'Varias respuestas incorrectas en el mismo bloque: el siguiente paso es corregir, no ampliar tema.',
        severity: 'high',
        badge: 'alerta',
      };
    case 'growth':
      return {
        title: 'Tu base aguanto bien',
        summary: `Buen dia en conjunto (${pct}%): hay margen para subir un punto de exigencia sin perder control.`,
        severity: 'low',
        badge: 'progreso',
      };
    case 'recovery':
      return {
        title: 'Hoy importaba reenganchar',
        summary:
          totalQuestions < 10
            ? 'Pocas preguntas, pero utiles para recuperar el hilo de estudio.'
            : 'Retomaste ritmo sin forzar un volumen absurdo.',
        severity: 'low',
        badge: 'recuperación',
      };
    default:
      return {
        title: 'Dia de consolidacion claro',
        summary:
          pct >= 70
            ? `Rendimiento estable (${pct}%): buen dia para fijar contenido.`
            : `Lectura mezclada (${pct}%): prioriza cerrar dudas antes de abrir bloques nuevos.`,
        severity: pct >= 70 ? 'low' : 'medium',
        badge: pct >= 70 ? 'estable' : 'alerta',
      };
  }
}

function closingFor(type: DailyReportDayType, accuracy: number): string {
  const pct = Math.round(accuracy * 100);
  switch (type) {
    case 'pressure':
      return 'Aqui hay transferencia a examen por trabajar con calma.';
    case 'pattern':
      return 'Corregir esto te hara subir mas que abrir temas nuevos.';
    case 'growth':
      return 'Ya hay margen para exigir un poco mas en la siguiente sesion.';
    case 'recovery':
      return 'La constancia de hoy vale mas que el volumen.';
    default:
      return pct >= 72
        ? 'Hoy ganaste base, no velocidad.'
        : 'La lectura fina fue mas importante que el volumen.';
  }
}

function subtitleFor(type: DailyReportDayType, dominant: PracticeMode): string {
  switch (type) {
    case 'pressure':
      return 'Entrenamiento bajo presion';
    case 'pattern':
      return 'Correccion de patron';
    case 'growth':
      return 'Sesion estable';
    case 'recovery':
      return 'Vuelta al ritmo';
    default:
      return dominant === 'simulacro' || dominant === 'anti_trap'
        ? 'Entrenamiento bajo presion'
        : 'Sesion de consolidacion';
  }
}

/**
 * Informe interpretativo del dia a partir de sesiones ya filtradas (mismo dia civil).
 */
export function buildDailyReport(
  sessions: PracticeSessionSummary[],
  dateKey: string,
  weakCategories?: PracticeCategoryRiskSummary[] | null,
): DailyReport | null {
  if (sessions.length === 0) return null;

  const date = new Date(`${dateKey}T12:00:00`);
  const dateLabel = date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const weekdayTitle = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const questionsSeen = sessions.reduce((sum, session) => sum + Math.max(0, session.total), 0);
  const correctAnswers = sessions.reduce((sum, session) => sum + Math.max(0, session.score), 0);
  const accuracyRate =
    questionsSeen > 0 ? Math.round((correctAnswers / questionsSeen) * 1000) / 10 : 0;
  const accuracy = questionsSeen > 0 ? correctAnswers / questionsSeen : 0;

  const totalSec = getSessionDurationsSecondsForStats(sessions).reduce((sum, seconds) => sum + seconds, 0);
  const totalStudyMinutes = Math.round(totalSec / 60);
  const avgResponseSeconds =
    questionsSeen > 0 ? Math.max(1, Math.round(totalSec / questionsSeen)) : 0;

  const dominant = dominantMode(sessions);
  const dominantModeLabel = MODE_LABEL[dominant] ?? dominant;

  const hasPressure = sessions.some(
    (session) => session.mode === 'simulacro' || session.mode === 'anti_trap',
  );

  const reviewedCount = sessions
    .filter((session) => session.mode === 'review' || session.mode === 'weakest')
    .reduce((sum, session) => sum + session.total, 0);
  const newCount = sessions
    .filter(
      (session) =>
        session.mode === 'standard' ||
        session.mode === 'quick_five' ||
        session.mode === 'random' ||
        session.mode === 'mixed',
    )
    .reduce((sum, session) => sum + session.total, 0);

  const dayType = classifyDay(sessions, accuracy, questionsSeen, hasPressure);
  const insight = insightFor(dayType, accuracy, questionsSeen, hasPressure);

  const topWeak = weakCategories?.[0];
  const weakestLabel =
    accuracy < 0.62 && topWeak?.category
      ? topWeak.category
      : accuracy < 0.62
        ? 'Repasa el bloque de fallos del dia'
        : topWeak?.category
          ? `${topWeak.category} (area a vigilar)`
          : 'Sin foco unico';

  const titles = sessions.map((session) => session.title).filter(Boolean);
  const mostWorkedLabel =
    titles.length === 1 ? titles[0]! : `${dominantModeLabel} (${sessions.length} sesiones)`;

  const compositionParts: string[] = [];
  if (reviewedCount > 0 || newCount > 0) {
    compositionParts.push(`${reviewedCount} repaso · ${newCount} nuevas`);
  }
  compositionParts.push(`Modo principal: ${dominantModeLabel}`);
  compositionParts.push(
    totalStudyMinutes > 0 ? `Duracion: ${totalStudyMinutes} min` : 'Duracion: -',
  );
  const compositionNote = compositionParts.join(' · ');

  return {
    dateLabel,
    weekdayTitle,
    dayType,
    subtitle: subtitleFor(dayType, dominant),
    questionsSeen,
    correctAnswers,
    accuracyRate,
    avgResponseSeconds,
    totalStudyMinutes,
    dominantMode: dominant,
    dominantModeLabel,
    reviewedCount,
    newCount,
    mostWorkedLabel,
    weakestLabel,
    compositionNote,
    primaryInsight: {
      title: insight.title,
      summary: insight.summary,
      severity: insight.severity,
      badge: insight.badge,
    },
    closingNote: closingFor(dayType, accuracy),
  };
}

export function filterSessionsForDay(
  sessions: PracticeSessionSummary[],
  dateKey: string,
): PracticeSessionSummary[] {
  return sessions.filter((session) => sessionFinishedLocalDayKey(session.finishedAt) === dateKey);
}
