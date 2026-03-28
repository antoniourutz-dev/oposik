export type OptionKey = 'a' | 'b' | 'c' | 'd';
export type PracticeMode =
  | 'standard'
  | 'weakest'
  | 'random'
  | 'review'
  | 'mixed'
  | 'simulacro'
  | 'anti_trap';

export interface PracticeQuestion {
  id: string;
  number: number | null;
  statement: string;
  options: Record<OptionKey, string>;
  correctOption: OptionKey;
  category: string | null;
  explanation: string | null;
  editorialExplanation?: string | null;
}

export interface PracticeAnswer {
  question: PracticeQuestion;
  selectedOption: OptionKey | null;
  isCorrect: boolean;
  answeredAt: string;
  responseTimeMs: number | null;
  timeToFirstSelectionMs: number | null;
  changedAnswer: boolean;
  errorTypeInferred: string | null;
}

export interface PracticeAnswerSubmission {
  selectedOption: OptionKey;
  answeredAt: string;
  responseTimeMs: number | null;
  timeToFirstSelectionMs: number | null;
  changedAnswer: boolean;
  errorTypeInferred?: string | null;
}

export interface PracticeQuestionStat {
  questionId: string;
  questionNumber: number | null;
  statement: string;
  category: string | null;
  explanation: string | null;
  editorialExplanation?: string | null;
  attempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  lastAnsweredAt: string;
  lastIncorrectAt: string | null;
}

export interface PracticeSessionSummary {
  id: string;
  mode: PracticeMode;
  title: string;
  startedAt: string;
  finishedAt: string;
  score: number;
  total: number;
  questionIds: string[];
}

export interface PracticeProfile {
  userId: string;
  curriculum: string;
  nextStandardBatchStartIndex: number;
  totalAnswered: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSessions: number;
  lastStudiedAt: string | null;
}

export interface PracticeCatalogSummary {
  totalQuestions: number;
}

export interface PracticeRiskInsight {
  errorType: string;
  label: string;
  count: number;
}

export interface PracticeLearningDashboard {
  totalQuestions: number;
  seenQuestions: number;
  readiness: number;
  readinessLower: number | null;
  readinessUpper: number | null;
  projectedReadiness: number | null;
  overdueCount: number;
  backlogCount: number;
  fragileCount: number;
  consolidatingCount: number;
  solidCount: number;
  masteredCount: number;
  newCount: number;
  recommendedReviewCount: number;
  recommendedNewCount: number;
  recommendedTodayCount: number;
  recommendedMode: PracticeMode;
  focusMessage: string;
  dailyReviewCapacity: number;
  dailyNewCapacity: number;
  examDate: string | null;
  riskBreakdown: PracticeRiskInsight[];
}

export interface PracticeExamTarget {
  userId: string;
  curriculum: string;
  examDate: string | null;
  dailyReviewCapacity: number;
  dailyNewCapacity: number;
  updatedAt: string | null;
}

export interface PracticePressureInsights {
  learningAccuracy: number | null;
  simulacroAccuracy: number | null;
  pressureGap: number | null;
  lastSimulacroAccuracy: number | null;
  lastSimulacroFinishedAt: string | null;
  avgSimulacroFatigue: number | null;
  overconfidenceRate: number | null;
  recommendedMode: PracticeMode | null;
  pressureMessage: string;
}

export interface PracticeCoachPlanChip {
  label: string;
  value: string;
}

export interface PracticeCoachPlan {
  mode: PracticeMode;
  tone: 'rescue' | 'build' | 'pressure' | 'advance' | 'maintain';
  eyebrow: string;
  title: string;
  summary: string;
  primaryActionLabel: string;
  focusLabel: string;
  impactLabel: string;
  reasons: string[];
  chips: PracticeCoachPlanChip[];
}

export interface ActivePracticeSession {
  id: string;
  mode: PracticeMode;
  feedbackMode: 'immediate' | 'deferred';
  title: string;
  subtitle: string;
  questions: PracticeQuestion[];
  startedAt: string;
  timeLimitSeconds: number | null;
  batchNumber: number;
  totalBatches: number;
  batchStartIndex: number | null;
  continueLabel: string;
  nextStandardBatchStartIndex: number | null;
}

export interface WeakQuestionInsight {
  question: PracticeQuestion;
  stat: PracticeQuestionStat;
}

export interface CloudPracticeState {
  profile: PracticeProfile | null;
  recentSessions: PracticeSessionSummary[];
  questionStats: PracticeQuestionStat[];
  learningDashboard: PracticeLearningDashboard | null;
  examTarget: PracticeExamTarget | null;
  pressureInsights: PracticePressureInsights | null;
}
