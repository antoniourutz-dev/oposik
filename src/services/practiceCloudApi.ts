import { PracticeAnswer, PracticeProfile, PracticeQuestionStat, PracticeSessionSummary, CloudPracticeState, ActivePracticeSession } from '../practiceTypes';
import { supabase } from '../supabase';
import { mapAccountApiError } from './accountApi';

const DEFAULT_CURRICULUM = 'general';

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
    normalizedMessage.includes('record_practice_session') ||
    normalizedMessage.includes('get_my_practice_profile') ||
    normalizedMessage.includes('schema cache')
  );
};

const mapPracticeCloudError = (error: { code?: string; message?: string; details?: string; hint?: string }) => {
  const mapped = mapAccountApiError(error);
  if (!mapped.startsWith('Ezin izan da erabiltzaile izena aldatu')) {
    return mapped;
  }

  if (isMissingPracticeBackend(error)) {
    return 'Faltan las funciones RPC de progreso en Supabase. Aplica las migraciones antes de usar cuentas reales.';
  }

  return `No se ha podido sincronizar el progreso: ${error.message ?? 'error desconocido'}`;
};

const mapProfile = (value: Record<string, unknown> | null): PracticeProfile | null => {
  if (!value) return null;

  return {
    userId: String(value.user_id ?? ''),
    curriculum: String(value.curriculum ?? DEFAULT_CURRICULUM),
    nextStandardBatchStartIndex: toNumber(value.next_standard_batch_start_index),
    totalAnswered: toNumber(value.total_answered),
    totalCorrect: toNumber(value.total_correct),
    totalIncorrect: toNumber(value.total_incorrect),
    totalSessions: toNumber(value.total_sessions),
    lastStudiedAt: toNullableString(value.last_studied_at)
  };
};

const mapSession = (value: Record<string, unknown>): PracticeSessionSummary => ({
  id: String(value.session_id ?? value.id ?? ''),
  mode: value.mode === 'weakest' ? 'weakest' : 'standard',
  title: String(value.title ?? 'Sesion'),
  startedAt: String(value.started_at ?? value.startedAt ?? ''),
  finishedAt: String(value.finished_at ?? value.finishedAt ?? ''),
  score: toNumber(value.score),
  total: toNumber(value.total),
  questionIds: []
});

const mapQuestionStat = (value: Record<string, unknown>): PracticeQuestionStat => ({
  questionId: String(value.question_id ?? value.questionId ?? ''),
  questionNumber: value.question_number === null || value.question_number === undefined ? null : toNumber(value.question_number, 0),
  statement: String(value.statement ?? value.question_statement ?? ''),
  category: toNullableString(value.category),
  explanation: toNullableString(value.explanation),
  attempts: toNumber(value.attempts),
  correctAttempts: toNumber(value.correct_attempts),
  incorrectAttempts: toNumber(value.incorrect_attempts),
  lastAnsweredAt: String(value.last_answered_at ?? value.lastAnsweredAt ?? ''),
  lastIncorrectAt: toNullableString(value.last_incorrect_at ?? value.lastIncorrectAt)
});

export const getMyPracticeState = async (curriculum = DEFAULT_CURRICULUM): Promise<CloudPracticeState> => {
  const { data: profileData, error: profileError } = await supabase
    .schema('app')
    .rpc('get_my_practice_profile')
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
    p_batch_number: Number(session.batchNumberLabel.split('/')[0]) || null,
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
