import { PracticeAnswer, CloudPracticeState, ActivePracticeSession } from '../practiceTypes';
import { DEFAULT_CURRICULUM } from '../practiceConfig';
import { supabase } from '../supabaseClient';
import {
  mapPracticeCloudError,
  mapProfile,
  mapQuestionStat,
  mapSession
} from './practiceCloudMappers';

export const getMyPracticeState = async (curriculum = DEFAULT_CURRICULUM): Promise<CloudPracticeState> => {
  const { data: profileData, error: profileError } = await supabase
    .schema('app')
    .rpc('get_my_practice_profile_for_curriculum', {
      p_curriculum: curriculum
    })
    .maybeSingle();

  if (profileError) {
    throw new Error(mapPracticeCloudError(profileError));
  }

  const [{ data: sessionsData, error: sessionsError }, { data: statsData, error: statsError }] =
    await Promise.all([
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
        .limit(500)
    ]);

  const firstError = sessionsError || statsError;
  if (firstError) {
    throw new Error(mapPracticeCloudError(firstError));
  }

  return {
    profile: mapProfile((profileData ?? null) as Record<string, unknown> | null),
    recentSessions: ((sessionsData ?? []) as Array<Record<string, unknown>>).map(mapSession),
    questionStats: ((statsData ?? []) as Array<Record<string, unknown>>).map(mapQuestionStat)
  };
};

export const recordPracticeSessionInCloud = async (
  session: ActivePracticeSession,
  answers: PracticeAnswer[],
  curriculum = DEFAULT_CURRICULUM
) => {
  const { error } = await supabase.schema('app').rpc('record_practice_session', {
    p_session_id: session.id,
    p_curriculum: curriculum,
    p_mode: session.mode,
    p_title: session.title,
    p_started_at: session.startedAt,
    p_finished_at: new Date().toISOString(),
    p_score: answers.filter((answer) => answer.isCorrect).length,
    p_total: answers.length,
    p_batch_number: session.batchNumber || null,
    p_batch_size: session.questions.length,
    p_batch_start_index: session.batchStartIndex,
    p_next_standard_batch_start_index: session.nextStandardBatchStartIndex ?? 0,
    p_attempts: answers.map((answer) => ({
      question_id: answer.question.id,
      question_number: answer.question.number,
      statement: answer.question.statement,
      category: answer.question.category,
      explanation: answer.question.explanation,
      selected_option: answer.selectedOption,
      correct_option: answer.question.correctOption,
      is_correct: answer.isCorrect
    }))
  });

  if (error) {
    throw new Error(mapPracticeCloudError(error));
  }
};
