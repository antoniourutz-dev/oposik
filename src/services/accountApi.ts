import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { trackAsyncOperation } from '../telemetry/telemetryClient';

export type AccountPlayerMode = 'advanced' | 'generic';

export type AccountIdentity = {
  user_id: string;
  current_username: string;
  is_admin: boolean;
  player_mode: AccountPlayerMode;
  previous_usernames: string[];
};

export type UsernameHistoryEntry = {
  change_id: number;
  old_username: string | null;
  new_username: string;
  changed_at: string;
  changed_by: string;
  source: string;
  reason: string | null;
  request_id: string;
};

export type UsernameChangeResult = {
  user_id: string;
  old_username: string | null;
  new_username: string;
  changed_at: string;
};

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_]{1,30}[a-z0-9])?$/;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const validateUsername = (value: string) => USERNAME_RE.test(normalizeUsername(value));

export const normalizeAccountPlayerMode = (value: unknown): AccountPlayerMode =>
  String(value ?? '').trim().toLowerCase() === 'generic' ? 'generic' : 'advanced';

const toStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean);
};

const mapAccountIdentity = (value: unknown): AccountIdentity | null => {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const userId = String(record.user_id ?? '').trim();
  const currentUsername = String(record.current_username ?? '').trim();

  if (!userId || !currentUsername) {
    return null;
  }

  return {
    user_id: userId,
    current_username: currentUsername,
    is_admin: Boolean(record.is_admin),
    player_mode: normalizeAccountPlayerMode(record.player_mode),
    previous_usernames: toStringArray(record.previous_usernames)
  };
};

export const getMyAccountIdentity = async () => {
  return trackAsyncOperation('account.getMyAccountIdentity', async () => {
    const { data, error } = await supabase
      .schema('app')
      .rpc('get_my_account_identity')
      .maybeSingle();

    if (error) throw new Error(mapAccountApiError(error));
    return mapAccountIdentity(data);
  });
};

export const getMyUsernameHistory = async (limit = 10) => {
  return trackAsyncOperation(
    'account.getMyUsernameHistory',
    async () => {
      const { data, error } = await supabase
        .schema('app')
        .from('username_change_history')
        .select('change_id, old_username, new_username, changed_at, changed_by, source, reason, request_id')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(mapAccountApiError(error));
      return (data ?? []) as UsernameHistoryEntry[];
    },
    { limit }
  );
};

export const mapAccountApiError = (error: Pick<PostgrestError, 'code' | 'message' | 'details' | 'hint'>) => {
  if (error.code === '23505') {
    return 'Ese usuario ya esta en uso o reservado.';
  }
  if (error.code === '22023') {
    const normalizedMessage = String(error.message || '').toLowerCase();
    if (normalizedMessage.includes('use_change_my_username_for_self')) {
      return 'Para cambiar tu usuario, utiliza tu perfil.';
    }
    if (normalizedMessage.includes('cannot_clear_own_results_from_admin')) {
      return 'No puedes borrar tus propios resultados desde la administracion.';
    }
    if (normalizedMessage.includes('invalid_day_index')) {
      return 'Has seleccionado un dia no valido.';
    }
    return 'Formato invalido. Usa entre 3 y 32 caracteres: a-z, 0-9 y _.';
  }
  if (error.code === 'PGRST106') {
    return 'El backend de usuarios no esta listo: el esquema `app` no esta expuesto en la API. Ejecuta `supabase config push` o exponlo en el panel.';
  }
  if (error.code === 'PGRST202') {
    return 'El backend de usuarios no esta listo: falta la RPC `change_my_username`. Aplica las migraciones primero.';
  }
  if (error.code === 'PGRST301') {
    return 'La sesion no es valida. Vuelve a iniciar sesion.';
  }
  if (error.code === '42501') {
    return 'La sesion ha caducado. Vuelve a iniciar sesion.';
  }
  const normalizedMessage = String(error.message || '').toLowerCase();
  if (normalizedMessage.includes('invalid schema: app')) {
    return 'El backend de usuarios no esta listo: el esquema `app` no esta expuesto en la API. Ejecuta `supabase config push` o exponlo en el panel.';
  }
  if (normalizedMessage.includes('could not find the function')) {
    return 'El backend de usuarios no esta listo: falta una RPC necesaria. Aplica las migraciones primero.';
  }
  if (normalizedMessage.includes('permission denied for schema app')) {
    return 'El backend de usuarios no tiene permisos suficientes. Revisa grants y politicas RLS.';
  }
  if (normalizedMessage.includes('username_unchanged')) {
    return 'Ese ya es tu usuario actual.';
  }
  if (normalizedMessage.includes('current_username_not_found')) {
    return 'No se ha encontrado tu usuario actual. Contacta con administracion.';
  }
  if (normalizedMessage.includes('target_user_not_found')) {
    return 'No se ha encontrado el usuario indicado.';
  }
  if (normalizedMessage.includes('forbidden')) {
    return 'No tienes permisos para realizar esta accion.';
  }
  if (normalizedMessage.includes('cannot_clear_own_results_from_admin')) {
    return 'No puedes borrar tus propios resultados desde la administracion.';
  }
  if (normalizedMessage.includes('invalid_player_mode')) {
    return 'El modo de jugador no es valido.';
  }
  if (normalizedMessage.includes('cannot_edit_admin_account')) {
    return 'Las cuentas admin no se pueden editar desde este panel.';
  }
  if (normalizedMessage.includes('use_change_my_username_for_self')) {
    return 'Para cambiar tu usuario, utiliza tu perfil.';
  }

  console.error('Supabase RPC Error:', error);
  return `No se ha podido completar la operacion: ${error.message} (Code: ${error.code})`;
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const changeMyUsername = async (nextUsernameInput: string) => {
  const nextUsername = normalizeUsername(nextUsernameInput);
  if (!validateUsername(nextUsername)) {
    throw new Error('Formato invalido. Usa entre 3 y 32 caracteres: a-z, 0-9 y _.');
  }

  return trackAsyncOperation(
    'account.changeMyUsername',
    async () => {
      const { data, error } = await supabase
        .schema('app')
        .rpc('change_my_username', {
          p_new_username: nextUsername,
          p_reason: 'self_service',
          p_request_id: generateUUID(),
          p_metadata: { client: 'web' }
        })
        .maybeSingle();

      if (error) {
        throw new Error(mapAccountApiError(error));
      }

      if (!data) {
        throw new Error('El servidor ha devuelto una respuesta vacia.');
      }

      const result = data as any;

      return {
        user_id: result.out_user_id,
        old_username: result.out_old_username ?? null,
        new_username: result.out_new_username,
        changed_at: result.out_changed_at,
      } as UsernameChangeResult;
    },
    { usernameLength: nextUsername.length }
  );
};
