import { PracticeAnswer, CloudPracticeState, ActivePracticeSession } from '../practiceTypes';
import { DEFAULT_CURRICULUM } from '../practiceConfig';
import { supabase } from '../supabaseClient';
import {
  mapExamTarget,
  mapPracticeCloudError,
  mapLearningDashboard,
  mapPressureInsights,
  mapProfile,
  mapQuestionStat,
  mapSession
} from './practiceCloudMappers';

const buildAttemptPayloads = (answers: PracticeAnswer[]) => {
  const attemptsByQuestionId = new Map<
    string,
    {
      question_id: string;
      question_number: number | null;
      statement: string;
      category: string | null;
      question_scope: string | null | undefined;
      explanation: string | null;
      selected_option: PracticeAnswer['selectedOption'];
      correct_option: PracticeAnswer['question']['correctOption'];
      is_correct: boolean;
      answered_at: string;
      response_time_ms: number | null;
      time_to_first_selection_ms: number | null;
      changed_answer: boolean;
      error_type_inferred: string | null;
    }
  >();

  for (const answer of answers) {
    const questionId = String(answer.question.id ?? '').trim();
    if (!questionId) continue;

    attemptsByQuestionId.set(questionId, {
      question_id: questionId,
      question_number: answer.question.number,
      statement: answer.question.statement,
      category: answer.question.category,
      question_scope: answer.question.questionScope,
      explanation: answer.question.explanation,
      selected_option: answer.selectedOption,
      correct_option: answer.question.correctOption,
      is_correct: answer.isCorrect,
      answered_at: answer.answeredAt,
      response_time_ms: answer.responseTimeMs,
      time_to_first_selection_ms: answer.timeToFirstSelectionMs,
      changed_answer: answer.changedAnswer,
      error_type_inferred: answer.errorTypeInferred
    });
  }

  return [...attemptsByQuestionId.values()];
};

export const getMyPracticeState = async (
  curriculum = DEFAULT_CURRICULUM
): Promise<CloudPracticeState> => {
  const [
    { data: profileData, error: profileError },
    { data: sessionsData, error: sessionsError },
    { data: statsData, error: statsError },
    { data: learningDashboardData, error: learningDashboardError },
    { data: examTargetData, error: examTargetError },
    { data: pressureInsightsData, error: pressureInsightsError }
  ] = await Promise.all([
    supabase
      .schema('app')
      .rpc('get_my_practice_profile_for_curriculum', {
        p_curriculum: curriculum
      })
      .maybeSingle(),
    supabase
      .schema('app')
      .from('practice_sessions')
      .select('session_id, mode, title, started_at, finished_at, score, total')
      .eq('curriculum', curriculum)
      .order('finished_at', { ascending: false })
      .limit(12),
    supabase
      .schema('app')
      .from('practice_question_stats')
      .select('question_id, question_number, statement, category, explanation, attempts, correct_attempts, incorrect_attempts, last_answered_at, last_incorrect_at')
      .eq('curriculum', curriculum)
      .order('incorrect_attempts', { ascending: false })
      .limit(500),
    supabase
      .schema('app')
      .rpc('get_readiness_dashboard', {
        p_curriculum: curriculum
      })
      .maybeSingle(),
    supabase
      .schema('app')
      .rpc('get_my_exam_target', {
        p_curriculum: curriculum
      })
      .maybeSingle(),
    supabase
      .schema('app')
      .rpc('get_pressure_dashboard', {
        p_curriculum: curriculum
      })
      .maybeSingle()
  ]);

  const firstError = profileError || sessionsError || statsError;
  if (firstError) {
    throw new Error(mapPracticeCloudError(firstError));
  }

  return {
    profile: mapProfile((profileData ?? null) as Record<string, unknown> | null),
    recentSessions: ((sessionsData ?? []) as Array<Record<string, unknown>>).map(mapSession),
    questionStats: ((statsData ?? []) as Array<Record<string, unknown>>).map(mapQuestionStat),
    learningDashboard: learningDashboardError
      ? null
      : mapLearningDashboard((learningDashboardData ?? null) as Record<string, unknown> | null),
    examTarget: examTargetError
      ? null
      : mapExamTarget((examTargetData ?? null) as Record<string, unknown> | null),
    pressureInsights: pressureInsightsError
      ? null
      : mapPressureInsights((pressureInsightsData ?? null) as Record<string, unknown> | null)
  };
};

export const upsertMyExamTarget = async ({
  curriculum = DEFAULT_CURRICULUM,
  examDate,
  dailyReviewCapacity,
  dailyNewCapacity
}: {
  curriculum?: string;
  examDate: string | null;
  dailyReviewCapacity: number;
  dailyNewCapacity: number;
}) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('upsert_my_exam_target', {
      p_curriculum: curriculum,
      p_exam_date: examDate,
      p_daily_review_capacity: dailyReviewCapacity,
      p_daily_new_capacity: dailyNewCapacity
    })
    .maybeSingle();

  if (error) {
    throw new Error(mapPracticeCloudError(error));
  }

  return mapExamTarget((data ?? null) as Record<string, unknown> | null);
};

export const recordPracticeSessionInCloud = async (
  session: ActivePracticeSession,
  answers: PracticeAnswer[],
  curriculum = DEFAULT_CURRICULUM
) => {
  const attemptPayloads = buildAttemptPayloads(answers);
  const uniqueSessionQuestionCount = new Set(
    session.questions
      .map((question) => String(question.id ?? '').trim())
      .filter(Boolean)
  ).size;
  const finishedAt = new Date().toISOString();
  const totalQuestions =
    session.mode === 'simulacro'
      ? uniqueSessionQuestionCount
      : attemptPayloads.length;

  const { error } = await supabase.schema('app').rpc('record_practice_session', {
    p_session_id: session.id,
    p_curriculum: curriculum,
    p_mode: session.mode,
    p_title: session.title,
    p_started_at: session.startedAt,
    p_finished_at: finishedAt,
    p_score: attemptPayloads.filter((attempt) => attempt.is_correct).length,
    p_total: totalQuestions,
    p_batch_number: session.batchNumber || null,
    p_batch_size: uniqueSessionQuestionCount,
    p_batch_start_index: session.batchStartIndex,
    p_next_standard_batch_start_index: session.nextStandardBatchStartIndex ?? 0,
    p_attempts: attemptPayloads
  });

  if (error) {
    throw new Error(mapPracticeCloudError(error));
  }
};
