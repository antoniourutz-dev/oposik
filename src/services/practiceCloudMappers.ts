import {
  PracticeProfile,
  PracticeQuestionStat,
  PracticeSessionSummary
} from '../practiceTypes';
import { DEFAULT_CURRICULUM } from '../practiceConfig';
import { mapAccountApiError } from './accountApi';

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
    normalizedMessage.includes('get_my_practice_profile_for_curriculum') ||
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
    lastStudiedAt: toNullableString(value.last_studied_at)
  };
};

export const mapSession = (value: Record<string, unknown>): PracticeSessionSummary => ({
  id: String(value.session_id ?? value.id ?? ''),
  mode:
    value.mode === 'weakest'
      ? 'weakest'
      : value.mode === 'random'
        ? 'random'
        : 'standard',
  title: String(value.title ?? 'Sesion'),
  startedAt: String(value.started_at ?? value.startedAt ?? ''),
  finishedAt: String(value.finished_at ?? value.finishedAt ?? ''),
  score: toNumber(value.score),
  total: toNumber(value.total),
  questionIds: []
});

export const mapQuestionStat = (value: Record<string, unknown>): PracticeQuestionStat => ({
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
