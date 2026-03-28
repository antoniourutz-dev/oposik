import { DEFAULT_CURRICULUM } from '../practiceConfig';
import { getSafeSupabaseSession, supabase } from '../supabaseClient';
import { supabaseAnonKey, supabaseUrl } from '../supabaseConfig';
import {
  UsernameHistoryEntry,
  mapAccountApiError,
  normalizeUsername,
  validateUsername
} from './accountApi';

export type AdminUserDirectoryEntry = {
  user_id: string;
  current_username: string | null;
  auth_email: string | null;
  is_admin: boolean;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  last_sign_in_at: string | null;
  previous_usernames: string[];
  rename_count: number;
  self_service_change_count: number;
  admin_change_count: number;
  total_sessions: number;
  total_answered: number;
  total_correct: number;
  total_incorrect: number;
  accuracy: number;
  last_studied_at: string | null;
};

export type AdminUserPracticeProfile = {
  user_id: string;
  curriculum: string;
  next_standard_batch_start_index: number;
  total_answered: number;
  total_correct: number;
  total_incorrect: number;
  total_sessions: number;
  accuracy: number;
  last_studied_at: string | null;
};

export type AdminWeakPracticeQuestion = {
  question_id: string;
  question_number: number | null;
  statement: string;
  category: string | null;
  explanation: string | null;
  editorial_explanation?: string | null;
  attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  last_answered_at: string;
  last_incorrect_at: string | null;
};

export type AdminCreateUserResult = {
  user_id: string;
  current_username: string;
  auth_email: string | null;
  created_at: string | null;
};

export type AdminUsernameChangeResult = {
  user_id: string;
  old_username: string | null;
  new_username: string;
  changed_at: string;
  warning: string | null;
};

export type AdminDeleteUserResult = {
  user_id: string;
  current_username: string | null;
  warning: string | null;
};

export type AdminResetPracticeProgressResult = {
  user_id: string;
  current_username: string | null;
  profiles_reset: number;
  sessions_deleted: number;
  attempts_deleted: number;
  question_stats_deleted: number;
  question_states_deleted: number;
  attempt_events_deleted: number;
};

export type AdminSetUserPasswordResult = {
  user_id: string;
  current_username: string | null;
};

type AdminDeleteResultsResult = {
  deleted_rows: number;
};

type AdminSetChallengeStartDateResult = {
  saved_start_date: string;
  deleted_rows: number;
};
const getAdminUserManagementFunctionUrl = () =>
  import.meta.env.VITE_ADMIN_USER_MANAGEMENT_FUNCTION_URL ||
  `${supabaseUrl}/functions/v1/admin-user-management`;

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean);
};

const toNullableString = (value: unknown) => {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : null;
};

const invokeAdminUserManagement = async <T>(payload: Record<string, unknown>) => {
  const session = await getSafeSupabaseSession();

  if (!session?.access_token) {
    throw new Error('Saioa iraungi da. Hasi berriro saioa.');
  }

  let response: Response;
  try {
    response = await fetch(getAdminUserManagementFunctionUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error('Ezin izan da administrazio zerbitzuarekin konektatu.');
  }

  const result = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    throw new Error(String(result?.message ?? 'Ezin izan da administrazio ekintza osatu.'));
  }

  return (result ?? {}) as T;
};

const mapAdminDirectoryEntry = (value: Record<string, unknown>): AdminUserDirectoryEntry => ({
  user_id: String(value.user_id ?? ''),
  current_username: toNullableString(value.current_username),
  auth_email: toNullableString(value.auth_email),
  is_admin: Boolean(value.is_admin),
  status: String(value.status ?? 'active'),
  created_at: value.created_at ? String(value.created_at) : null,
  updated_at: value.updated_at ? String(value.updated_at) : null,
  last_sign_in_at: value.last_sign_in_at ? String(value.last_sign_in_at) : null,
  previous_usernames: toStringArray(value.previous_usernames),
  rename_count: toNumber(value.rename_count),
  self_service_change_count: toNumber(value.self_service_change_count),
  admin_change_count: toNumber(value.admin_change_count),
  total_sessions: toNumber(value.total_sessions),
  total_answered: toNumber(value.total_answered),
  total_correct: toNumber(value.total_correct),
  total_incorrect: toNumber(value.total_incorrect),
  accuracy: toNumber(value.accuracy),
  last_studied_at: value.last_studied_at ? String(value.last_studied_at) : null
});

const mapAdminPracticeProfile = (value: Record<string, unknown>) => ({
  user_id: String(value.user_id ?? ''),
  curriculum: String(value.curriculum ?? 'general'),
  next_standard_batch_start_index: toNumber(value.next_standard_batch_start_index),
  total_answered: toNumber(value.total_answered),
  total_correct: toNumber(value.total_correct),
  total_incorrect: toNumber(value.total_incorrect),
  total_sessions: toNumber(value.total_sessions),
  accuracy: toNumber(value.accuracy),
  last_studied_at: toNullableString(value.last_studied_at)
}) satisfies AdminUserPracticeProfile;

const mapAdminWeakQuestion = (value: Record<string, unknown>) => ({
  question_id: String(value.question_id ?? ''),
  question_number: value.question_number === null || value.question_number === undefined ? null : toNumber(value.question_number),
  statement: String(value.statement ?? ''),
  category: toNullableString(value.category),
  explanation: toNullableString(value.explanation),
  editorial_explanation: toNullableString(
    value.editorial_explanation ??
      value.explicacion_editorial ??
      value.editorial_summary ??
      value.summary ??
      value.resumen
  ),
  attempts: toNumber(value.attempts),
  correct_attempts: toNumber(value.correct_attempts),
  incorrect_attempts: toNumber(value.incorrect_attempts),
  last_answered_at: String(value.last_answered_at ?? ''),
  last_incorrect_at: toNullableString(value.last_incorrect_at)
}) satisfies AdminWeakPracticeQuestion;

export const getAdminUsers = async (search = '', limit = 80) => {
  const normalizedSearch = normalizeUsername(search);
  const { data, error } = await supabase
    .schema('app')
    .rpc('admin_list_users', {
      p_search: normalizedSearch || null,
      p_limit: limit
    });

  if (error) {
    throw new Error(mapAccountApiError(error));
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map(mapAdminDirectoryEntry)
    .filter((entry) => Boolean(entry.user_id));
};

export const getAdminUsernameTimeline = async (userId: string) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('admin_get_username_timeline', {
      p_user_id: userId
    });

  if (error) {
    throw new Error(mapAccountApiError(error));
  }

  return (data ?? []) as UsernameHistoryEntry[];
};

export const getAdminPracticeProfile = async (userId: string, curriculum = DEFAULT_CURRICULUM) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('admin_get_practice_profile_for_curriculum', {
      p_user_id: userId,
      p_curriculum: curriculum
    })
    .maybeSingle();

  if (error) {
    throw new Error(mapAccountApiError(error));
  }

  return data ? mapAdminPracticeProfile(data as Record<string, unknown>) : null;
};

export const getAdminRecentPracticeSessions = async (
  userId: string,
  limit = 8,
  curriculum = DEFAULT_CURRICULUM
) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('admin_get_recent_practice_sessions_for_curriculum', {
      p_user_id: userId,
      p_limit: limit,
      p_curriculum: curriculum
    });

  if (error) {
    throw new Error(mapAccountApiError(error));
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((entry) => ({
    id: String(entry.session_id ?? ''),
    mode:
      entry.mode === 'weakest'
        ? 'weakest'
        : entry.mode === 'random'
          ? 'random'
          : 'standard',
    title: String(entry.title ?? 'Sesion'),
    startedAt: String(entry.started_at ?? ''),
    finishedAt: String(entry.finished_at ?? ''),
    score: toNumber(entry.score),
    total: toNumber(entry.total),
    questionIds: []
  }));
};

export const getAdminWeakPracticeQuestions = async (
  userId: string,
  limit = 5,
  curriculum = DEFAULT_CURRICULUM
) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('admin_get_weak_practice_questions_for_curriculum', {
      p_user_id: userId,
      p_limit: limit,
      p_curriculum: curriculum
    });

  if (error) {
    throw new Error(mapAccountApiError(error));
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map(mapAdminWeakQuestion);
};

export const adminChangeUsername = async (
  userId: string,
  nextUsernameInput: string,
  reason = 'admin_panel'
) => {
  const nextUsername = normalizeUsername(nextUsernameInput);
  if (!validateUsername(nextUsername)) {
    throw new Error('Formato baliogabea. Erabili 3-32 karaktere: a-z, 0-9 eta _.');
  }

  const result = await invokeAdminUserManagement<Record<string, unknown>>({
    action: 'change_user_username',
    userId,
    username: nextUsername,
    reason,
    requestId: generateUUID()
  });

  return {
    user_id: String(result.user_id ?? ''),
    old_username: toNullableString(result.old_username),
    new_username: String(result.new_username ?? ''),
    changed_at: String(result.changed_at ?? ''),
    warning: toNullableString(result.warning)
  } as AdminUsernameChangeResult;
};

export const adminCreateUser = async (
  username: string,
  password: string
) => {
  const result = await invokeAdminUserManagement<AdminCreateUserResult>({
    action: 'create_user',
    username,
    password
  });

  return {
    user_id: String(result.user_id ?? ''),
    current_username: String(result.current_username ?? ''),
    auth_email: toNullableString(result.auth_email),
    created_at: toNullableString(result.created_at)
  } as AdminCreateUserResult;
};

export const adminDeleteUser = async (userId: string) => {
  const result = await invokeAdminUserManagement<AdminDeleteUserResult>({
    action: 'delete_user',
    userId
  });

  return {
    user_id: String(result.user_id ?? userId),
    current_username: toNullableString(result.current_username),
    warning: toNullableString(result.warning)
  } as AdminDeleteUserResult;
};

export const adminResetPracticeProgress = async (
  userId: string,
  curriculum: string | null = null
) => {
  const result = await invokeAdminUserManagement<AdminResetPracticeProgressResult>({
    action: 'reset_practice_progress',
    userId,
    curriculum
  });

  return {
    user_id: String(result.user_id ?? userId),
    current_username: toNullableString(result.current_username),
    profiles_reset: toNumber(result.profiles_reset),
    sessions_deleted: toNumber(result.sessions_deleted),
    attempts_deleted: toNumber(result.attempts_deleted),
    question_stats_deleted: toNumber(result.question_stats_deleted),
    question_states_deleted: toNumber(result.question_states_deleted),
    attempt_events_deleted: toNumber(result.attempt_events_deleted)
  } as AdminResetPracticeProgressResult;
};

export const adminSetUserPassword = async (userId: string, password: string) => {
  const result = await invokeAdminUserManagement<AdminSetUserPasswordResult>({
    action: 'set_user_password',
    userId,
    password
  });

  return {
    user_id: String(result.user_id ?? userId),
    current_username: toNullableString(result.current_username)
  } as AdminSetUserPasswordResult;
};

export const adminClearUserGameResults = async (
  userId: string,
  dayIndex: number | null = null
) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('admin_clear_user_game_results', {
      p_user_id: userId,
      p_day_index: typeof dayIndex === 'number' ? dayIndex : null
    })
    .maybeSingle();

  if (error) {
    throw new Error(mapAccountApiError(error));
  }

  return {
    deleted_rows: toNumber((data as AdminDeleteResultsResult | null)?.deleted_rows)
  };
};

export const adminSetChallengeStartDate = async (
  startDate: string,
  resetBeforeIso: string
) => {
  const { data, error } = await supabase
    .schema('app')
    .rpc('admin_set_challenge_start_date', {
      p_start_date: startDate,
      p_reset_before: resetBeforeIso
    })
    .maybeSingle();

  if (error) {
    throw new Error(mapAccountApiError(error));
  }

  return {
    saved_start_date: String((data as AdminSetChallengeStartDateResult | null)?.saved_start_date ?? startDate),
    deleted_rows: toNumber((data as AdminSetChallengeStartDateResult | null)?.deleted_rows)
  };
};
