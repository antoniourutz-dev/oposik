import type { PracticeCategoryRiskSummary, PracticeSessionSummary } from '../../practiceTypes';
import type { PracticeMode } from '../../practiceTypes';
import type { DailyReport, DailyReportDayType, DailyReportInsightSeverity } from './types';

const MODE_LABEL: Record<PracticeMode, string> = {
  standard: 'Consolidación',
  weakest: 'Repaso de fallos',
  random: 'Variedad',
  review: 'Repaso',
  mixed: 'Mixta',
  simulacro: 'Simulacro',
  anti_trap: 'Anti trampas',
  catalog_review: 'Lectura de catálogo',
};

function isoDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function sessionDurationSec(s: PracticeSessionSummary): number {
  const a = new Date(s.startedAt);
  const b = new Date(s.finishedAt);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, (b.getTime() - a.getTime()) / 1000);
}

function dominantMode(sessions: PracticeSessionSummary[]): PracticeMode {
  const counts = new Map<PracticeMode, number>();
  sessions.forEach((s) => {
    counts.set(s.mode, (counts.get(s.mode) ?? 0) + s.total);
  });
  let best: PracticeMode = sessions[0]!.mode;
  let max = -1;
  counts.forEach((n, m) => {
    if (n > max) {
      max = n;
      best = m;
    }
  });
  return best;
}

function classifyDay(
  sessions: PracticeSessionSummary[],
  acc: number,
  totalQ: number,
  hasPressure: boolean,
): DailyReportDayType {
  if (totalQ === 0) return 'recovery';
  const incorrectRatio = 1 - acc;
  if (hasPressure && acc < 0.62) return 'pressure';
  if (incorrectRatio >= 0.42 && totalQ >= 6) return 'pattern';
  if (acc >= 0.78 && totalQ >= 12) return 'growth';
  if (totalQ <= 8 && sessions.length <= 2 && acc >= 0.5) return 'recovery';
  return 'consolidation';
}

function insightFor(
  type: DailyReportDayType,
  acc: number,
  totalQ: number,
  hasPressure: boolean,
): { title: string; summary: string; severity: DailyReportInsightSeverity; badge: DailyReport['primaryInsight']['badge'] } {
  const pct = Math.round(acc * 100);
  switch (type) {
    case 'pressure':
      return {
        title: hasPressure ? 'La exigencia marcó el ritmo' : 'Día intenso',
        summary:
          acc < 0.65
            ? `Con ${pct}% de acierto, conviene revisar lectura fina antes de sumar volumen.`
            : `Mantuviste un ${pct}% aceptable pese al contexto exigente.`,
        severity: acc < 0.55 ? 'high' : 'medium',
        badge: acc < 0.62 ? 'alerta' : 'estable',
      };
    case 'pattern':
      return {
        title: 'Se repetía el mismo tipo de fallo',
        summary:
          'Varias respuestas incorrectas en el mismo bloque: el siguiente paso es corregir, no ampliar tema.',
        severity: 'high',
        badge: 'alerta',
      };
    case 'growth':
      return {
        title: 'Tu base aguantó bien',
        summary: `Buen día en conjunto (${pct}%): hay margen para subir un punto de exigencia sin perder control.`,
        severity: 'low',
        badge: 'progreso',
      };
    case 'recovery':
      return {
        title: 'Hoy importaba reenganchar',
        summary:
          totalQ < 10
            ? 'Pocas preguntas, pero útiles para recuperar el hilo de estudio.'
            : 'Retomaste ritmo sin forzar un volumen absurdo.',
        severity: 'low',
        badge: 'recuperación',
      };
    default:
      return {
        title: 'Día de consolidación claro',
        summary:
          pct >= 70
            ? `Rendimiento estable (${pct}%): buen día para fijar contenido.`
            : `Lectura mezclada (${pct}%): prioriza cerrar dudas antes de abrir bloques nuevos.`,
        severity: pct >= 70 ? 'low' : 'medium',
        badge: pct >= 70 ? 'estable' : 'alerta',
      };
  }
}

function closingFor(type: DailyReportDayType, acc: number): string {
  const pct = Math.round(acc * 100);
  switch (type) {
    case 'pressure':
      return 'Aquí hay transferencia a examen por trabajar con calma.';
    case 'pattern':
      return 'Corregir esto te hará subir más que abrir temas nuevos.';
    case 'growth':
      return 'Ya hay margen para exigir un poco más en la siguiente sesión.';
    case 'recovery':
      return 'La constancia de hoy vale más que el volumen.';
    default:
      return pct >= 72
        ? 'Hoy ganaste base, no velocidad.'
        : 'La lectura fina fue más importante que el volumen.';
  }
}

function subtitleFor(type: DailyReportDayType, dominant: PracticeMode): string {
  switch (type) {
    case 'pressure':
      return 'Entrenamiento bajo presión';
    case 'pattern':
      return 'Corrección de patrón';
    case 'growth':
      return 'Sesión estable';
    case 'recovery':
      return 'Vuelta al ritmo';
    default:
      return dominant === 'simulacro' || dominant === 'anti_trap'
        ? 'Entrenamiento bajo presión'
        : 'Sesión de consolidación';
  }
}

/**
 * Informe interpretativo del día a partir de sesiones ya filtradas (mismo día civil).
 */
export function buildDailyReport(
  sessions: PracticeSessionSummary[],
  dateKey: string,
  weakCategories?: PracticeCategoryRiskSummary[] | null,
): DailyReport | null {
  if (sessions.length === 0) return null;

  const d = new Date(`${dateKey}T12:00:00`);
  const dateLabel = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const weekdayTitle = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const questionsSeen = sessions.reduce((s, x) => s + Math.max(0, x.total), 0);
  const correctAnswers = sessions.reduce((s, x) => s + Math.max(0, x.score), 0);
  const accuracyRate = questionsSeen > 0 ? Math.round((correctAnswers / questionsSeen) * 1000) / 10 : 0;
  const acc = questionsSeen > 0 ? correctAnswers / questionsSeen : 0;

  const totalSec = sessions.reduce((s, x) => s + sessionDurationSec(x), 0);
  const totalStudyMinutes = Math.round(totalSec / 60);
  const avgResponseSeconds =
    questionsSeen > 0 ? Math.max(1, Math.round(totalSec / questionsSeen)) : 0;

  const dom = dominantMode(sessions);
  const dominantModeLabel = MODE_LABEL[dom] ?? dom;

  const hasPressure = sessions.some((s) => s.mode === 'simulacro' || s.mode === 'anti_trap');

  const reviewedCount = sessions
    .filter((s) => s.mode === 'review' || s.mode === 'weakest')
    .reduce((s, x) => s + x.total, 0);
  const newCount = sessions
    .filter((s) => s.mode === 'standard' || s.mode === 'random' || s.mode === 'mixed')
    .reduce((s, x) => s + x.total, 0);

  const dayType = classifyDay(sessions, acc, questionsSeen, hasPressure);
  const insight = insightFor(dayType, acc, questionsSeen, hasPressure);

  const topWeak = weakCategories?.[0];
  const weakestLabel =
    acc < 0.62 && topWeak?.category
      ? topWeak.category
      : acc < 0.62
        ? 'Repasa el bloque de fallos del día'
        : topWeak?.category
          ? `${topWeak.category} (área a vigilar)`
          : 'Sin foco único';

  const titles = sessions.map((s) => s.title).filter(Boolean);
  const mostWorkedLabel =
    titles.length === 1
      ? titles[0]!
      : `${dominantModeLabel} (${sessions.length} sesiones)`;

  const compositionParts: string[] = [];
  if (reviewedCount > 0 || newCount > 0) {
    compositionParts.push(`${reviewedCount} repaso · ${newCount} nuevas`);
  }
  compositionParts.push(`Modo principal: ${dominantModeLabel}`);
  compositionParts.push(totalStudyMinutes > 0 ? `Duración: ${totalStudyMinutes} min` : 'Duración: —');
  const compositionNote = compositionParts.join(' · ');

  const sub = subtitleFor(dayType, dom);

  return {
    dateLabel,
    weekdayTitle,
    dayType,
    subtitle: sub,
    questionsSeen,
    correctAnswers,
    accuracyRate,
    avgResponseSeconds,
    totalStudyMinutes,
    dominantMode: dom,
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
    closingNote: closingFor(dayType, acc),
  };
}

export function filterSessionsForDay(
  sessions: PracticeSessionSummary[],
  dateKey: string,
): PracticeSessionSummary[] {
  return sessions.filter((s) => isoDay(s.finishedAt) === dateKey);
}
