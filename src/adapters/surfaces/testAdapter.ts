import type { CoachPlanV2 } from '../../domain/learningEngine/coachV2';
import type { ActiveLearningContext } from '../../domain/learningContext/types';
import type {
  ActivePracticeSession,
  PracticeAnswer,
  PracticeCategoryRiskSummary,
  PracticeLearningDashboardV2,
  PracticePressureInsightsV2,
  PracticeProfile,
  PracticeQuestion,
  PracticeQuestionScopeFilter,
  PracticeSessionSummary,
} from '../../practiceTypes';
import { resolveDominantState } from './dominantState';
import type { SurfaceDominantState, SurfaceTension } from './surfaceTypes';

export type TestAdapterOutput = {
  dominantState: SurfaceDominantState;
  tone: CoachPlanV2['tone'];
  tension: SurfaceTension;
  headerContext?: {
    label: string;
    subdued: boolean;
  };
  answerUi: {
    highlightImportantText: boolean;
    revealHelpLevel: 'low' | 'medium' | 'high';
    compactOptions: boolean;
  };
  feedbackStyle: {
    kind: 'protective' | 'neutral' | 'corrective' | 'exam';
    showMicroReinforcement: boolean;
    explanationPriority: 'low' | 'medium' | 'high';
  };
  submitCta: string;
};

export type TestAdapterSurfaceContext = {
  planV2: CoachPlanV2;
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  weakCategories?: PracticeCategoryRiskSummary[] | null;
  recentSessions?: PracticeSessionSummary[] | null;
  streakDays?: number;
  profile?: PracticeProfile | null;
  activeLearningContext?: ActiveLearningContext | null;
};

const tensionByState: Record<SurfaceDominantState, SurfaceTension> = {
  backlog: 'medium',
  errors: 'medium',
  pressure: 'high',
  recovery: 'low',
  memory: 'low',
  growth: 'high',
  gray_zone: 'low',
};

const headerLabelByState: Record<SurfaceDominantState, string> = {
  recovery: 'Volviendo al ritmo',
  backlog: 'Consolidando base',
  errors: 'Corrigiendo errores clave',
  pressure: 'Entrenando bajo presion',
  growth: 'Subiendo exigencia',
  memory: 'Fijando lo visto',
  gray_zone: 'Midiendo tu nivel',
};

export function buildTestAdapterOutput(input: {
  planV2: CoachPlanV2;
  activeSession: ActivePracticeSession;
  answers: PracticeAnswer[];
  currentQuestion: PracticeQuestion;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  selectedQuestionScope: PracticeQuestionScopeFilter;
  surfaceContext?: TestAdapterSurfaceContext | null;
}): TestAdapterOutput {
  const {
    planV2,
    activeSession,
    answers: _answers,
    currentQuestion: _currentQuestion,
    pressureInsightsV2,
    selectedQuestionScope: _selectedQuestionScope,
    surfaceContext,
  } = input;

  const dominantState = resolveDominantState({
    learningDashboardV2: surfaceContext?.learningDashboardV2,
    pressureInsightsV2: pressureInsightsV2 ?? surfaceContext?.pressureInsightsV2,
    weakCategories: surfaceContext?.weakCategories,
    recentSessions: surfaceContext?.recentSessions,
    profile: surfaceContext?.profile,
    streakDays: surfaceContext?.streakDays,
  });

  const tone = planV2.tone;
  const tension = tensionByState[dominantState];
  const subdued = tension === 'low' || dominantState === 'gray_zone';
  const contextConfig = surfaceContext?.activeLearningContext?.config;
  const supportsExamMode = contextConfig?.capabilities.supportsExamMode ?? true;

  const headerContext = {
    label:
      dominantState === 'pressure'
        ? contextConfig?.coachOverrides.pressureHeaderLabel ?? headerLabelByState.pressure
        : headerLabelByState[dominantState],
    subdued,
  };

  const answerUi: TestAdapterOutput['answerUi'] = (() => {
    switch (dominantState) {
      case 'recovery':
        return { highlightImportantText: true, revealHelpLevel: 'medium', compactOptions: false };
      case 'backlog':
      case 'errors':
        return { highlightImportantText: true, revealHelpLevel: 'high', compactOptions: false };
      case 'pressure':
      case 'growth':
        return { highlightImportantText: true, revealHelpLevel: 'low', compactOptions: true };
      case 'memory':
        return { highlightImportantText: true, revealHelpLevel: 'medium', compactOptions: false };
      default:
        return { highlightImportantText: true, revealHelpLevel: 'medium', compactOptions: false };
    }
  })();

  const feedbackStyle: TestAdapterOutput['feedbackStyle'] = (() => {
    switch (dominantState) {
      case 'recovery':
        return { kind: 'protective', showMicroReinforcement: true, explanationPriority: 'low' };
      case 'backlog':
        return { kind: 'neutral', showMicroReinforcement: true, explanationPriority: 'high' };
      case 'errors':
        return { kind: 'corrective', showMicroReinforcement: false, explanationPriority: 'high' };
      case 'pressure':
        return {
          kind: supportsExamMode ? 'exam' : 'neutral',
          showMicroReinforcement: false,
          explanationPriority: 'low',
        };
      case 'growth':
        return {
          kind: supportsExamMode ? 'exam' : 'neutral',
          showMicroReinforcement: false,
          explanationPriority: 'medium',
        };
      case 'memory':
        return {
          kind: 'protective',
          showMicroReinforcement: true,
          explanationPriority: 'medium',
        };
      default:
        return { kind: 'neutral', showMicroReinforcement: true, explanationPriority: 'medium' };
    }
  })();

  const submitCta: string = (() => {
    switch (dominantState) {
      case 'recovery':
        return 'Seguir';
      case 'backlog':
        return 'Resolver';
      case 'errors':
        return 'Comprobar patron';
      case 'pressure':
        return 'Confirmar';
      case 'growth':
        return 'Validar';
      case 'memory':
        return 'Fijar respuesta';
      case 'gray_zone':
        return 'Registrar respuesta';
      default:
        return 'Comprobar respuesta';
    }
  })();

  void _answers;
  void _currentQuestion;
  void _selectedQuestionScope;

  const simulacroSurface =
    activeSession.mode === 'simulacro' && supportsExamMode
      ? {
          headerContext: { label: 'Entrenando examen', subdued: false as const },
          answerUi: {
            ...answerUi,
            highlightImportantText: true,
            revealHelpLevel: 'low' as const,
            compactOptions: true,
          },
          feedbackStyle: {
            kind: 'exam' as const,
            showMicroReinforcement: true,
            explanationPriority: 'low' as const,
          },
          submitCta: 'Confirmar' as const,
        }
      : null;

  const quickFiveSurface =
    activeSession.mode === 'quick_five'
      ? {
          headerContext: {
            label: 'Hoy cuenta entrar',
            subdued: true as const,
          },
          answerUi: {
            ...answerUi,
            highlightImportantText: true,
            revealHelpLevel: 'medium' as const,
            compactOptions: false,
          },
          feedbackStyle: {
            kind: 'protective' as const,
            showMicroReinforcement: true,
            explanationPriority: 'low' as const,
          },
          submitCta: 'Seguir' as const,
        }
      : null;

  return {
    dominantState,
    tone,
    tension,
    headerContext: quickFiveSurface?.headerContext ?? simulacroSurface?.headerContext ?? headerContext,
    answerUi: quickFiveSurface?.answerUi ?? simulacroSurface?.answerUi ?? answerUi,
    feedbackStyle:
      quickFiveSurface?.feedbackStyle ?? simulacroSurface?.feedbackStyle ?? feedbackStyle,
    submitCta: quickFiveSurface?.submitCta ?? simulacroSurface?.submitCta ?? submitCta,
  };
}

export function resolveQuizPrimaryButtonLabel(
  test: TestAdapterOutput,
  ctx: {
    questionIndex: number;
    totalQuestions: number;
    feedbackMode: 'immediate' | 'deferred';
  },
): string {
  const { questionIndex, totalQuestions, feedbackMode } = ctx;
  const isLast = questionIndex === totalQuestions - 1;
  if (feedbackMode === 'deferred') {
    if (isLast) return 'Finalizar simulacro';
    return 'Guardar y seguir';
  }
  if (isLast) return 'Ver resultados';
  return test.submitCta;
}

export function quizFeedbackAnnouncement(input: {
  isCorrect: boolean;
  hasSelection: boolean;
  feedbackStyle: TestAdapterOutput['feedbackStyle'];
}): string {
  const { isCorrect, hasSelection, feedbackStyle } = input;
  if (!hasSelection) return '';

  const { kind } = feedbackStyle;
  if (isCorrect) {
    if (kind === 'exam') return 'Correcto. Siguiente.';
    if (kind === 'protective') return 'Bien. Manten el ritmo.';
    if (kind === 'neutral') return 'Correcto. Consolidas.';
    return 'Correcto.';
  }

  if (kind === 'corrective') return 'Patron a ajustar. Mira el matiz.';
  if (kind === 'exam') return 'Incorrecto. Cierra y sigue.';
  if (kind === 'protective') return 'Sin drama. Corriges y listo.';
  if (kind === 'neutral') return 'Aqui conviene repasar el detalle.';
  return 'Revisa el matiz y sigue.';
}
