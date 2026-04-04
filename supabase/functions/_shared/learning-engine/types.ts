export type LearningOptionKey = 'a' | 'b' | 'c' | 'd';

export type ErrorType =
  | 'concepto'
  | 'literalidad'
  | 'plazo'
  | 'organo_competente'
  | 'procedimiento'
  | 'excepcion'
  | 'negacion'
  | 'distractor_cercano'
  | 'lectura_rapida'
  | 'sobreconfianza'
  | 'confusion_entre_normas'
  | 'memoria_fragil';

export type MasteryLevel = 0 | 1 | 2 | 3 | 4;

export type RecentPerformanceScore = 0 | 0.2 | 0.8 | 1;

export interface UserQuestionState {
  userId: string;
  questionId: string;
  curriculum: string;
  questionNumber: number | null;
  statement: string;
  category: string | null;
  explanation: string | null;
  attempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  distinctSuccessfulDays: number;
  lastResult: 'correct' | 'incorrect' | null;
  lastSelectedOption: LearningOptionKey | null;
  lastSeenAt: string | null;
  lastCorrectAt: string | null;
  nextReviewAt: string | null;
  masteryLevel: MasteryLevel;
  stabilityScore: number;
  retrievabilityScore: number;
  pCorrectEstimated: number;
  avgResponseTimeMs: number | null;
  medianResponseTimeMs: number | null;
  lastResponseTimeMs: number | null;
  fastCorrectCount: number;
  slowCorrectCount: number;
  lapseCount: number;
  examRetentionProbability: number;
  reviewsNeededBeforeExam: number;
  dominantErrorType: ErrorType | null;
  timesExplanationOpened: number;
  timesChangedAnswer: number;
}

export interface AttemptInput {
  userId: string;
  questionId: string;
  curriculum: string;
  questionNumber: number | null;
  statement: string;
  category: string | null;
  explanation: string | null;
  selectedOption: LearningOptionKey | null;
  correctOption: LearningOptionKey;
  isCorrect: boolean;
  responseTimeMs: number | null;
  timeToFirstSelectionMs: number | null;
  changedAnswer: boolean;
  answeredAt: string;
  errorTypeInferred?: ErrorType | null;
  referenceTimeMs?: number | null;
  globalDifficulty?: number | null;
}

export interface ReadinessSnapshot {
  readiness: number;
  readinessLower: number | null;
  readinessUpper: number | null;
  overdueCount: number;
  fragileCount: number;
  masteredCount: number;
  projectedReadiness: number | null;
}

export interface QuestionStateTransition {
  previousState: UserQuestionState | null;
  nextState: UserQuestionState;
  latencyFactor: number;
  errorPenalty: number;
  difficultyFactor: number;
  examFactor: number;
  intervalDays: number;
}

// UI & Coach Types
export type PracticeMode =
  | 'standard'
  | 'quick_five'
  | 'weakest'
  | 'random'
  | 'review'
  | 'mixed'
  | 'simulacro'
  | 'anti_trap';

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
