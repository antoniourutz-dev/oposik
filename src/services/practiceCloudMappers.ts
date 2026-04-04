import {
  PracticeCategoryRiskSummary,
  PracticeExamTarget,
  PracticeConfidenceFlag,
  PracticeLearningDashboard,
  PracticeLearningDashboardV2,
  PracticePressureInsights,
  PracticePressureInsightsV2,
  PracticeProfile,
  PracticeQuestionStat,
  PracticeRiskInsight,
  PracticeSessionSummary,
  PracticeWeakCategorySummary,
} from '../practiceTypes';
import { DEFAULT_CURRICULUM } from '../practiceConfig';
import { mapAccountApiError } from './accountApi';
import { normalizeQuestionScope } from '../utils/practiceQuestionScope';
import { mapExternalErrorType } from './errorTypeMappers';
import {
  mapExternalPracticeConfidenceFlag,
  mapExternalPracticeMode,
} from './controlledContractMappers';

const toNullableString = (value: unknown) => {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : null;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isMissingPracticeBackend = (error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}) => {
  const normalizedMessage = String(error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST106' ||
    error.code === 'PGRST202' ||
    error.code === 'PGRST205' ||
    normalizedMessage.includes('practice_profile') ||
    normalizedMessage.includes('practice_session') ||
    normalizedMessage.includes('practice_question_stats') ||
    normalizedMessage.includes('user_question_state') ||
    normalizedMessage.includes('exam_targets') ||
    normalizedMessage.includes('record_practice_session') ||
    normalizedMessage.includes('get_my_practice_profile') ||
    normalizedMessage.includes('get_my_practice_profile_for_curriculum') ||
    normalizedMessage.includes('get_my_exam_target') ||
    normalizedMessage.includes('upsert_my_exam_target') ||
    normalizedMessage.includes('record_question_explanation_opened') ||
    normalizedMessage.includes('get_readiness_dashboard') ||
    normalizedMessage.includes('get_readiness_dashboard_v2') ||
    normalizedMessage.includes('get_pressure_dashboard') ||
    normalizedMessage.includes('get_pressure_dashboard_v2') ||
    normalizedMessage.includes('get_weak_category_summary') ||
    normalizedMessage.includes('get_category_risk_dashboard') ||
    normalizedMessage.includes('get_mixed_practice_batch') ||
    normalizedMessage.includes('get_anti_trap_batch') ||
    normalizedMessage.includes('get_simulacro_batch') ||
    normalizedMessage.includes('schema cache')
  );
};

export const mapPracticeCloudError = (error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}) => {
  const mapped = mapAccountApiError(error);
  if (isMissingPracticeBackend(error)) {
    return 'Faltan las funciones RPC de progreso en Supabase. Aplica las migraciones antes de usar cuentas reales.';
  }

  if (!mapped.startsWith('No se ha podido completar la operacion:')) {
    return mapped;
  }

  return `No se ha podido sincronizar el progreso: ${error.message ?? 'error desconocido'}`;
};

export const mapProfile = (value: Record<string, unknown> | null): PracticeProfile | null => {
  if (!value) return null;

  return {
    userId: String(value.user_id ?? ''),
    curriculum: String(value.curriculum ?? DEFAULT_CURRICULUM),
    nextStandardBatchStartIndex: toNumber(value.next_standard_batch_start_index),
    totalAnswered: toNumber(value.total_answered),
    totalCorrect: toNumber(value.total_correct),
    totalIncorrect: toNumber(value.total_incorrect),
    totalSessions: toNumber(value.total_sessions),
    lastStudiedAt: toNullableString(value.last_studied_at),
  };
};

const mapPracticeMode = (value: unknown): PracticeSessionSummary['mode'] =>
  mapExternalPracticeMode(value);

export const mapSession = (value: Record<string, unknown>): PracticeSessionSummary => ({
  id: String(value.session_id ?? value.id ?? ''),
  mode: mapPracticeMode(value.mode),
  title: String(value.title ?? 'Sesion'),
  startedAt: String(value.started_at ?? value.startedAt ?? ''),
  finishedAt: String(value.finished_at ?? value.finishedAt ?? ''),
  score: toNumber(value.score),
  total: toNumber(value.total),
  questionIds: [],
});

export const mapQuestionStat = (value: Record<string, unknown>): PracticeQuestionStat => ({
  questionId: String(value.question_id ?? value.questionId ?? ''),
  questionNumber:
    value.question_number === null || value.question_number === undefined
      ? null
      : toNumber(value.question_number, 0),
  statement: String(value.statement ?? value.question_statement ?? ''),
  category: toNullableString(value.category),
  questionScope: normalizeQuestionScope(value.question_scope ?? value.questionScope),
  explanation: toNullableString(value.explanation),
  editorialExplanation: toNullableString(
    value.editorial_explanation ??
      value.editorialExplanation ??
      value.explicacion_editorial ??
      value.editorial_summary ??
      value.resumen_editorial ??
      value.summary ??
      value.resumen,
  ),
  attempts: toNumber(value.attempts),
  correctAttempts: toNumber(value.correct_attempts),
  incorrectAttempts: toNumber(value.incorrect_attempts),
  lastAnsweredAt: String(value.last_answered_at ?? value.lastAnsweredAt ?? ''),
  lastIncorrectAt: toNullableString(value.last_incorrect_at ?? value.lastIncorrectAt),
});

export const mapWeakCategorySummary = (
  value: Record<string, unknown>,
): PracticeWeakCategorySummary => ({
  category: toNullableString(value.category) ?? 'Sin grupo',
  incorrectAttempts: toNumber(value.incorrect_attempts),
  attempts: toNumber(value.attempts),
});

const mapRiskInsight = (value: unknown): PracticeRiskInsight | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const errorType = mapExternalErrorType(row.error_type ?? row.errorType);
  const label = toNullableString(row.label);
  if (!errorType || !label) return null;

  return {
    errorType,
    label,
    count: toNumber(row.count, 0),
  };
};

const toConfidenceFlag = (value: unknown): PracticeConfidenceFlag =>
  mapExternalPracticeConfidenceFlag(value);

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const mapLearningDashboard = (
  value: Record<string, unknown> | null,
): PracticeLearningDashboard | null => {
  if (!value) return null;

  const rawRiskBreakdown = Array.isArray(value.risk_breakdown)
    ? value.risk_breakdown
    : Array.isArray(value.riskBreakdown)
      ? value.riskBreakdown
      : [];

  return {
    totalQuestions: toNumber(value.total_questions),
    seenQuestions: toNumber(value.seen_questions),
    readiness: Number(value.readiness ?? 0.25) || 0.25,
    readinessLower:
      value.readiness_lower === null || value.readiness_lower === undefined
        ? null
        : Number(value.readiness_lower),
    readinessUpper:
      value.readiness_upper === null || value.readiness_upper === undefined
        ? null
        : Number(value.readiness_upper),
    projectedReadiness:
      value.projected_readiness === null || value.projected_readiness === undefined
        ? null
        : Number(value.projected_readiness),
    overdueCount: toNumber(value.overdue_count),
    backlogCount: toNumber(value.backlog_count),
    fragileCount: toNumber(value.fragile_count),
    consolidatingCount: toNumber(value.consolidating_count),
    solidCount: toNumber(value.solid_count),
    masteredCount: toNumber(value.mastered_count),
    newCount: toNumber(value.new_count),
    recommendedReviewCount: toNumber(value.recommended_review_count),
    recommendedNewCount: toNumber(value.recommended_new_count),
    recommendedTodayCount: toNumber(value.recommended_today_count),
    recommendedMode: mapPracticeMode(value.recommended_mode),
    focusMessage:
      toNullableString(value.focus_message) ??
      'Hoy conviene mantener el ritmo con una sesion adaptativa.',
    dailyReviewCapacity: toNumber(value.daily_review_capacity, 35),
    dailyNewCapacity: toNumber(value.daily_new_capacity, 10),
    examDate: toNullableString(value.exam_date),
    riskBreakdown: rawRiskBreakdown
      .map(mapRiskInsight)
      .filter((item): item is PracticeRiskInsight => Boolean(item)),
  };
};

export const mapLearningDashboardV2 = (
  value: Record<string, unknown> | null,
): PracticeLearningDashboardV2 | null => {
  if (!value) return null;

  const rawLawBreakdown = Array.isArray(value.law_breakdown) ? value.law_breakdown : [];
  const rawTopicBreakdown = Array.isArray(value.topic_breakdown) ? value.topic_breakdown : [];

  return {
    totalQuestions: toNumber(value.total_questions),
    seenQuestions: toNumber(value.seen_questions),
    coverageRate: toNumber(value.coverage_rate),
    observedAccuracyRate: toNumber(value.observed_accuracy_rate),
    observedAccuracyN: toNumber(value.observed_accuracy_n),
    observedAccuracyCiLow: toNullableNumber(value.observed_accuracy_ci_low),
    observedAccuracyCiHigh: toNullableNumber(value.observed_accuracy_ci_high),
    observedAccuracySampleOk: Boolean(value.observed_accuracy_sample_ok),
    retentionSeenRate: toNullableNumber(value.retention_seen_rate),
    retentionSeenN: toNumber(value.retention_seen_n),
    retentionSeenConfidenceFlag: toConfidenceFlag(value.retention_seen_confidence_flag),
    unseenPriorRate: toNumber(value.unseen_prior_rate, 0.25),
    examReadinessRate: toNumber(value.exam_readiness_rate, 0.25),
    examReadinessCiLow: toNullableNumber(value.exam_readiness_ci_low),
    examReadinessCiHigh: toNullableNumber(value.exam_readiness_ci_high),
    examReadinessConfidenceFlag: toConfidenceFlag(value.exam_readiness_confidence_flag),
    backlogOverdueCount: toNumber(value.backlog_overdue_count),
    fragileCount: toNumber(value.fragile_count),
    consolidatingCount: toNumber(value.consolidating_count),
    solidCount: toNumber(value.solid_count),
    masteredCount: toNumber(value.mastered_count),
    recommendedReviewCount: toNumber(value.recommended_review_count),
    recommendedNewCount: toNumber(value.recommended_new_count),
    recommendedTodayCount: toNumber(value.recommended_today_count),
    recommendedMode: mapPracticeMode(value.recommended_mode),
    focusMessage:
      toNullableString(value.focus_message) ??
      'La preparacion compuesta aun se esta estabilizando.',
    lawBreakdown: rawLawBreakdown.map((law: any) => {
      const rawBlocks = law.blocks ?? law.block_breakdown;
      const blocks = Array.isArray(rawBlocks)
        ? rawBlocks.map((b: Record<string, unknown>) => ({
            blockId: String(b.block_id ?? b.blockId ?? ''),
            title: toNullableString(b.title) ?? 'Bloque',
            trainingFocus: toNullableString(b.training_focus ?? b.trainingFocus),
            questionCount: toNumber(b.question_count ?? b.questionCount),
            consolidatedCount: toNumber(b.consolidated_count ?? b.consolidatedCount),
            attempts: toNumber(b.attempts),
            correctAttempts: toNumber(b.correct_attempts ?? b.correctAttempts),
            accuracyRate: toNumber(b.accuracy_rate ?? b.accuracyRate),
          }))
        : undefined;

      return {
        ley_referencia: String(law.ley_referencia || 'Otras Normas'),
        lawId: toNullableString(law.law_id ?? law.lawId) ?? undefined,
        shortTitle: toNullableString(law.short_title ?? law.shortTitle),
        trainingIntent: toNullableString(law.training_intent ?? law.trainingIntent),
        blocks: blocks && blocks.length > 0 ? blocks : undefined,
        scope: normalizeQuestionScope(law.raw_scope) ?? 'unknown',
        attempts: toNumber(law.attempts),
        questionCount: toNumber(law.question_count),
        consolidatedCount: toNumber(law.consolidated_count),
        correctAttempts: toNumber(law.correct_attempts),
        accuracyRate: toNumber(law.accuracy_rate),
      };
    }),
    topicBreakdown: rawTopicBreakdown.flatMap((topic: any) => {
      const topicLabel = toNullableString(
        topic.topic_label ?? topic.temario_pregunta ?? topic.label,
      );
      if (!topicLabel) return [];

      return [
        {
          topicLabel,
          scope: normalizeQuestionScope(topic.raw_scope) ?? 'unknown',
          attempts: toNumber(topic.attempts),
          questionCount: toNumber(topic.question_count),
          consolidatedCount: toNumber(topic.consolidated_count),
          unseenCount: toNumber(topic.unseen_count ?? topic.unseenCount),
          fragileCount: toNumber(topic.fragile_count ?? topic.fragileCount),
          consolidatingCount: toNumber(topic.consolidating_count ?? topic.consolidatingCount),
          solidCount: toNumber(topic.solid_count ?? topic.solidCount),
          masteredCount: toNumber(topic.mastered_count ?? topic.masteredCount),
          correctAttempts: toNumber(topic.correct_attempts),
          accuracyRate: toNumber(topic.accuracy_rate),
        },
      ];
    }),
  };
};

export const mapCategoryRiskSummary = (
  value: Record<string, unknown>,
): PracticeCategoryRiskSummary => ({
  category: toNullableString(value.category) ?? 'Sin grupo',
  attempts: toNumber(value.attempts),
  incorrectAttempts: toNumber(value.incorrect_attempts),
  rawFailRate: toNullableNumber(value.raw_fail_rate),
  smoothedFailRate: toNullableNumber(value.smoothed_fail_rate),
  baselineFailRate: toNullableNumber(value.baseline_fail_rate),
  excessRisk: toNullableNumber(value.excess_risk),
  sampleOk: Boolean(value.sample_ok),
  confidenceFlag: toConfidenceFlag(value.confidence_flag),
});

export const mapExamTarget = (value: Record<string, unknown> | null): PracticeExamTarget | null => {
  if (!value) return null;

  return {
    userId: String(value.user_id ?? ''),
    curriculum: String(value.curriculum ?? DEFAULT_CURRICULUM),
    examDate: toNullableString(value.exam_date),
    dailyReviewCapacity: toNumber(value.daily_review_capacity, 35),
    dailyNewCapacity: toNumber(value.daily_new_capacity, 10),
    updatedAt: toNullableString(value.updated_at),
  };
};

export const mapPressureInsights = (
  value: Record<string, unknown> | null,
): PracticePressureInsights | null => {
  if (!value) return null;

  const recommendedMode = mapPracticeMode(value.recommended_mode);
  return {
    learningAccuracy: toNullableNumber(value.learning_accuracy),
    simulacroAccuracy: toNullableNumber(value.simulacro_accuracy),
    pressureGap: toNullableNumber(value.pressure_gap),
    lastSimulacroAccuracy: toNullableNumber(value.last_simulacro_accuracy),
    lastSimulacroFinishedAt: toNullableString(value.last_simulacro_finished_at),
    avgSimulacroFatigue: toNullableNumber(value.avg_simulacro_fatigue),
    overconfidenceRate: toNullableNumber(value.overconfidence_rate),
    recommendedMode:
      value.recommended_mode === null || value.recommended_mode === undefined
        ? null
        : recommendedMode,
    pressureMessage:
      toNullableString(value.pressure_message) ??
      'Sigue combinando practica adaptativa y simulacros para medir la transferencia real.',
  };
};

export const mapPressureInsightsV2 = (
  value: Record<string, unknown> | null,
): PracticePressureInsightsV2 | null => {
  if (!value) return null;

  const recommendedMode = mapPracticeMode(value.recommended_mode);
  return {
    learningAccuracy: toNullableNumber(value.learning_accuracy),
    simulacroAccuracy: toNullableNumber(value.simulacro_accuracy),
    pressureGapRaw: toNullableNumber(value.pressure_gap_raw),
    learningSessionN: toNumber(value.learning_session_n),
    simulacroSessionN: toNumber(value.simulacro_session_n),
    learningQuestionN: toNumber(value.learning_question_n),
    simulacroQuestionN: toNumber(value.simulacro_question_n),
    avgSimulacroFatigue: toNullableNumber(value.avg_simulacro_fatigue),
    overconfidenceRate: toNullableNumber(value.overconfidence_rate),
    sampleOk: Boolean(value.sample_ok),
    confidenceFlag: toConfidenceFlag(value.confidence_flag),
    recommendedMode:
      value.recommended_mode === null || value.recommended_mode === undefined
        ? null
        : recommendedMode,
    pressureMessage:
      toNullableString(value.pressure_message) ??
      'Todavia no hay senal suficiente para leer bien la presion de examen.',
  };
};
