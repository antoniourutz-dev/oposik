import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
import type {
  ActivePracticeSession,
  PracticeAnswer,
  PracticeCategoryRiskSummary,
  PracticeLearningDashboardV2,
  PracticePressureInsightsV2,
  PracticeProfile,
  PracticeSessionSummary,
} from '../../practiceTypes';
import { resolveDominantState } from './dominantState';
import type { SurfaceDominantState, SurfaceTension } from './surfaceTypes';

export type ReviewAdapterOutput = {
  dominantState: SurfaceDominantState;
  tone: CoachPlanV2['tone'];
  tension: SurfaceTension;
  summary: {
    title: string;
    subtitle?: string;
  };
  filterPriority: 'mistakes_first' | 'pressure_mistakes' | 'weak_only' | 'mixed';
  explanationStyle: {
    highlightPatterns: boolean;
    showErrorTypeLabel: boolean;
    showRetrySuggestion: boolean;
  };
  nextStep: {
    cta: string;
    modeSuggestion?: string;
  };
};

export type ReviewAdapterSurfaceContext = {
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  weakCategories?: PracticeCategoryRiskSummary[] | null;
  recentSessions?: PracticeSessionSummary[] | null;
  streakDays?: number;
  profile?: PracticeProfile | null;
};

const tensionByState: Record<SurfaceDominantState, SurfaceTension> = {
  backlog: 'medium',
  errors: 'medium',
  pressure: 'high',
  recovery: 'low',
  memory: 'low',
  growth: 'medium',
  gray_zone: 'low',
};

const summaryTitleByState: Record<SurfaceDominantState, string> = {
  errors: 'El patrón ya tiene nombre',
  backlog: 'La deuda baja si la atacas así',
  pressure: 'Con presión se ve el fallo',
  recovery: 'Volver ya es señal',
  memory: 'Fija antes de acelerar',
  growth: 'Sube exigencia sin perder control',
  gray_zone: 'Ordena señal, luego ritmo',
};

export function buildReviewAdapterOutput(input: {
  planV2: CoachPlanV2;
  answers: PracticeAnswer[];
  activeSession: ActivePracticeSession;
  surfaceContext?: ReviewAdapterSurfaceContext | null;
}): ReviewAdapterOutput {
  const { planV2, answers, activeSession, surfaceContext } = input;

  const dominantState = resolveDominantState({
    learningDashboardV2: surfaceContext?.learningDashboardV2,
    pressureInsightsV2: surfaceContext?.pressureInsightsV2,
    weakCategories: surfaceContext?.weakCategories,
    recentSessions: surfaceContext?.recentSessions,
    profile: surfaceContext?.profile,
    streakDays: surfaceContext?.streakDays,
  });

  const incorrectCount = answers.reduce((acc, a) => acc + (a.isCorrect ? 0 : 1), 0);

  const filterPriority: ReviewAdapterOutput['filterPriority'] =
    activeSession.mode === 'simulacro' || dominantState === 'pressure'
      ? 'pressure_mistakes'
      : dominantState === 'errors'
        ? 'mistakes_first'
        : dominantState === 'backlog'
          ? 'mistakes_first'
          : incorrectCount > 0
            ? 'mistakes_first'
            : 'mixed';

  const explanationStyle: ReviewAdapterOutput['explanationStyle'] = {
    highlightPatterns: dominantState === 'errors',
    showErrorTypeLabel: dominantState === 'errors' || dominantState === 'pressure',
    showRetrySuggestion: dominantState === 'errors' || dominantState === 'backlog',
  };

  const nextStep: ReviewAdapterOutput['nextStep'] = (() => {
    if (activeSession.mode === 'simulacro') return { cta: 'Panel', modeSuggestion: 'simulacro' };
    if (dominantState === 'pressure') return { cta: 'Entrenar examen', modeSuggestion: 'simulacro' };
    if (dominantState === 'errors') return { cta: 'Corregir ahora', modeSuggestion: 'mistakes' };
    if (dominantState === 'recovery') return { cta: 'Seguir suave', modeSuggestion: 'standard' };
    if (dominantState === 'growth') return { cta: 'Subir nivel', modeSuggestion: 'standard' };
    return { cta: 'Continuar', modeSuggestion: 'standard' };
  })();

  return {
    dominantState,
    tone: planV2.tone,
    tension: tensionByState[dominantState],
    summary: {
      title: summaryTitleByState[dominantState],
      subtitle:
        dominantState === 'errors'
          ? 'Repite el gesto correcto en lo que falla dos veces.'
          : dominantState === 'pressure'
            ? 'Entrena el mismo gesto con el cronómetro encendido.'
            : dominantState === 'backlog'
              ? 'Cierra lo viejo antes de abrir carga nueva.'
              : undefined,
    },
    filterPriority,
    explanationStyle,
    nextStep,
  };
}

