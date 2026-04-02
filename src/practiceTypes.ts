/**
 * Contratos de aplicacion: catalogo de preguntas, sesiones activas, dashboard y estado en nube.
 * Los tipos de clasificacion de errores del motor de aprendizaje (`ErrorType`) se definen en
 * `domain/learningEngine/types` y se reexportan aqui para un punto de entrada unico en la app.
 */
import type { ErrorType } from './domain/learningEngine/types';

export type { ErrorType };

export type OptionKey = 'a' | 'b' | 'c' | 'd';
export type PracticeQuestionScope = 'common' | 'specific';
export type PracticeQuestionScopeFilter = 'all' | PracticeQuestionScope;
export type PracticeMode =
  | 'standard'
  | 'weakest'
  | 'random'
  | 'review'
  | 'mixed'
  | 'simulacro'
  | 'anti_trap'
  /** Recorrido lectura de todo el catálogo (común o específico), sin registrar intentos. */
  | 'catalog_review';

export interface PracticeQuestion {
  id: string;
  number: number | null;
  statement: string;
  options: Record<OptionKey, string>;
  correctOption: OptionKey;
  category: string | null;
  ley_referencia?: string | null;
  topicLabel?: string | null;
  questionScope?: PracticeQuestionScope | null;
  explanation: string | null;
  editorialExplanation?: string | null;
}

/** Respuesta registrada en una sesion de practica (UI + inferencia de error del dominio). */
export interface PracticeAnswer {
  question: PracticeQuestion;
  selectedOption: OptionKey | null;
  isCorrect: boolean;
  answeredAt: string;
  responseTimeMs: number | null;
  timeToFirstSelectionMs: number | null;
  changedAnswer: boolean;
  errorTypeInferred: ErrorType | null;
}

/** Payload enviado al registrar una respuesta (sin la pregunta completa; se combina en el hook). */
export interface PracticeAnswerSubmission {
  selectedOption: OptionKey;
  answeredAt: string;
  responseTimeMs: number | null;
  timeToFirstSelectionMs: number | null;
  changedAnswer: boolean;
  errorTypeInferred?: ErrorType | null;
}

export interface PracticeQuestionStat {
  questionId: string;
  questionNumber: number | null;
  statement: string;
  category: string | null;
  questionScope?: PracticeQuestionScope | null;
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

export interface PracticeWeakCategorySummary {
  category: string;
  incorrectAttempts: number;
  attempts: number;
}

export interface PracticeCategoryRiskSummary {
  category: string;
  attempts: number;
  incorrectAttempts: number;
  rawFailRate: number | null;
  smoothedFailRate: number | null;
  baselineFailRate: number | null;
  excessRisk: number | null;
  sampleOk: boolean;
  confidenceFlag: PracticeConfidenceFlag;
}

export interface PracticeRiskInsight {
  errorType: ErrorType;
  label: string;
  count: number;
}

export type PracticeConfidenceFlag = 'low' | 'medium' | 'high';

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

export interface PracticeLawPerformance {
  ley_referencia: string;
  scope?: 'common' | 'specific' | 'unknown';
  attempts: number;
  questionCount?: number;
  /** Preguntas con `mastery_level >= 3` (solid o mastered). */
  consolidatedCount?: number;
  correctAttempts: number;
  accuracyRate: number;
}

export interface PracticeTopicPerformance {
  topicLabel: string;
  scope?: 'common' | 'specific' | 'unknown';
  attempts: number;
  questionCount?: number;
  /** Preguntas con `mastery_level >= 3` (solid o mastered). */
  consolidatedCount?: number;
  correctAttempts: number;
  accuracyRate: number;
}

export interface PracticeLearningDashboardV2 {
  totalQuestions: number;
  seenQuestions: number;
  coverageRate: number;
  observedAccuracyRate: number;
  observedAccuracyN: number;
  observedAccuracyCiLow: number | null;
  observedAccuracyCiHigh: number | null;
  observedAccuracySampleOk: boolean;
  retentionSeenRate: number | null;
  retentionSeenN: number;
  retentionSeenConfidenceFlag: PracticeConfidenceFlag;
  unseenPriorRate: number;
  examReadinessRate: number;
  examReadinessCiLow: number | null;
  examReadinessCiHigh: number | null;
  examReadinessConfidenceFlag: PracticeConfidenceFlag;
  backlogOverdueCount: number;
  fragileCount: number;
  consolidatingCount: number;
  solidCount: number;
  masteredCount: number;
  recommendedReviewCount: number;
  recommendedNewCount: number;
  recommendedTodayCount: number;
  recommendedMode: PracticeMode;
  focusMessage: string;
  lawBreakdown?: PracticeLawPerformance[];
  topicBreakdown?: PracticeTopicPerformance[];
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

export interface PracticePressureInsightsV2 {
  learningAccuracy: number | null;
  simulacroAccuracy: number | null;
  pressureGapRaw: number | null;
  learningSessionN: number;
  simulacroSessionN: number;
  learningQuestionN: number;
  simulacroQuestionN: number;
  avgSimulacroFatigue: number | null;
  overconfidenceRate: number | null;
  sampleOk: boolean;
  confidenceFlag: PracticeConfidenceFlag;
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
  questionScope?: PracticeQuestionScopeFilter;
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
  learningDashboard: PracticeLearningDashboard | null;
  learningDashboardV2?: PracticeLearningDashboardV2 | null;
  examTarget: PracticeExamTarget | null;
  pressureInsights: PracticePressureInsights | null;
  pressureInsightsV2?: PracticePressureInsightsV2 | null;
}
