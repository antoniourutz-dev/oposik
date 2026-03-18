import { getSafeSupabaseSession, supabase, supabaseAnonKey, supabaseUrl } from '../supabase';
import {
  UsernameChangeResult,
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
  previous_usernames: string[];
  rename_count: number;
  self_service_change_count: number;
  admin_change_count: number;
  played_days: number;
  total_points: number;
  last_played_at: string | null;
};

export type AdminCreateUserResult = {
  user_id: string;
  current_username: string;
  auth_email: string | null;
  created_at: string | null;
};

export type AdminDeleteUserResult = {
  user_id: string;
  current_username: string | null;
  warning: string | null;
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
  previous_usernames: toStringArray(value.previous_usernames),
  rename_count: toNumber(value.rename_count),
  self_service_change_count: toNumber(value.self_service_change_count),
  admin_change_count: toNumber(value.admin_change_count),
  played_days: toNumber(value.played_days),
  total_points: toNumber(value.total_points),
  last_played_at: value.last_played_at ? String(value.last_played_at) : null
});

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

export const adminChangeUsername = async (
  userId: string,
  nextUsernameInput: string,
  reason = 'admin_panel'
) => {
  const nextUsername = normalizeUsername(nextUsernameInput);
  if (!validateUsername(nextUsername)) {
    throw new Error('Formato baliogabea. Erabili 3-32 karaktere: a-z, 0-9 eta _.');
  }

  const { data, error } = await supabase
    .schema('app')
    .rpc('admin_change_username', {
      p_user_id: userId,
      p_new_username: nextUsername,
      p_reason: reason,
      p_request_id: generateUUID(),
      p_metadata: { client: 'web', actor: 'admin_panel' }
    })
    .maybeSingle();

  if (error) {
    throw new Error(mapAccountApiError(error));
  }

  if (!data) {
    throw new Error('Erantzun hutsa jaso da zerbitzaritik.');
  }

  const result = data as Record<string, unknown>;

  return {
    user_id: String(result.out_user_id ?? ''),
    old_username: toNullableString(result.out_old_username),
    new_username: String(result.out_new_username ?? ''),
    changed_at: String(result.out_changed_at ?? '')
  } as UsernameChangeResult;
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
