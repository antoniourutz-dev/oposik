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
  WeakQuestionInsight
} from '../../practiceTypes';

export type DashboardExamTargetPayload = {
  examDate: string | null;
  dailyReviewCapacity: number;
  dailyNewCapacity: number;
};

export type DashboardScreenProps = {
  activeTab: MainTab;
  identity: AccountIdentity;
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
  onReloadQuestions: () => void;
  onSaveExamTarget: (payload: DashboardExamTargetPayload) => void;
  onSignOut: () => void;
  savingExamTarget: boolean;
};

export type DashboardContentProps = Omit<DashboardScreenProps, 'activeTab'>;
