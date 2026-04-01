import type { MainTab } from '../BottomDock';
import type { AccountIdentity } from '../../services/accountApi';
import type {
  PracticeCategoryRiskSummary,
  PracticeCoachPlan,
  PracticeExamTarget,
  PracticeLearningDashboard,
  PracticeLearningDashboardV2,
  PracticePressureInsights,
  PracticePressureInsightsV2,
  PracticeProfile,
  PracticeQuestionScopeFilter,
  PracticeSessionSummary,
  WeakQuestionInsight,
} from '../../practiceTypes';

export type DashboardExamTargetPayload = {
  examDate: string | null;
  dailyReviewCapacity: number;
  dailyNewCapacity: number;
};

/** Sesión de práctica pausada en Inicio (vista home con `activeSession` en memoria). */
export type HomePausedSessionSnapshot = {
  totalQuestions: number;
  currentQuestionIndex: number;
};

export type DashboardScreenProps = {
  activeTab: MainTab;
  identity: AccountIdentity;
  /** Catálogo de preguntas aún en carga: bloquea inicio de sesiones que dependen del banco. */
  catalogLoading?: boolean;
  /** Progreso de sesión en el hero cuando el usuario volvió a Inicio sin cerrar el quiz. */
  homePausedSession?: HomePausedSessionSnapshot | null;
  /** Reanudar quiz/repaso cuando el hero muestra “sesión en curso”. */
  onResumePracticeSession?: () => void;
  coachPlan: PracticeCoachPlan;
  examTarget: PracticeExamTarget | null;
  examTargetError: string | null;
  learningDashboard: PracticeLearningDashboard | null;
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  pressureInsights: PracticePressureInsights | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
  profile: PracticeProfile | null;
  recentSessions: PracticeSessionSummary[];
  questionsCount: number;
  totalBatches: number;
  batchSize: number;
  recommendedBatchNumber: number;
  weakQuestions: WeakQuestionInsight[];
  weakCategories: PracticeCategoryRiskSummary[];
  questionScope: PracticeQuestionScopeFilter;
  onQuestionScopeChange: (questionScope: PracticeQuestionScopeFilter) => void;
  onStartSimulacro: () => void;
  onStartAntiTrap: () => void;
  onStartRecommended: () => void;
  onStartMixed: () => void;
  onStartRandom: () => void;
  onStartFromBeginning: () => void;
  onStartWeakReview: () => void;
  onStartLawTraining: (ley: string) => void;
  /** Recorrido pregunta a pregunta de todo el catálogo (solo común o solo específico). */
  onStartCatalogReview: (scope: 'common' | 'specific') => void;
  onReloadQuestions: () => void;
  onSaveExamTarget: (payload: DashboardExamTargetPayload) => void;
  onSignOut: () => void;
  savingExamTarget: boolean;
};

export type DashboardContentProps = Omit<DashboardScreenProps, 'activeTab'>;
