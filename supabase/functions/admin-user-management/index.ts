import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type CreateUserPayload = {
  action: 'create_user';
  username?: string;
  password?: string;
  playerMode?: string;
};

type DeleteUserPayload = {
  action: 'delete_user';
  userId?: string;
};

type ResetPracticeProgressPayload = {
  action: 'reset_practice_progress';
  userId?: string;
  curriculum?: string | null;
};

type SetUserPasswordPayload = {
  action: 'set_user_password';
  userId?: string;
  password?: string;
};

type ChangeUserUsernamePayload = {
  action: 'change_user_username';
  userId?: string;
  username?: string;
  reason?: string | null;
  requestId?: string | null;
};

type SetUserPlayerModePayload = {
  action: 'set_user_player_mode';
  userId?: string;
  playerMode?: string;
};

type RequestPayload =
  | CreateUserPayload
  | DeleteUserPayload
  | ResetPracticeProgressPayload
  | SetUserPasswordPayload
  | ChangeUserUsernamePayload
  | SetUserPlayerModePayload;

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_]{1,30}[a-z0-9])?$/;
const MIN_PASSWORD_LENGTH = 3;
const VALID_PLAYER_MODES = ['advanced', 'generic'] as const;
type PlayerMode = (typeof VALID_PLAYER_MODES)[number];

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  });

const normalizeUsername = (value: string) => value.trim().toLowerCase();
const isValidUsername = (value: string) => USERNAME_RE.test(normalizeUsername(value));
const buildInternalEmail = (username: string) => `${username}@quantia.app`;
const parsePlayerMode = (value: unknown): PlayerMode | null => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return VALID_PLAYER_MODES.includes(normalized as PlayerMode)
    ? (normalized as PlayerMode)
    : null;
};

const getActorClient = (authorizationHeader: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorizationHeader } }
  });

const getActorUser = async (authorizationHeader: string) => {
  const actorClient = getActorClient(authorizationHeader);
  const {
    data: { user },
    error
  } = await actorClient.auth.getUser();

  if (error || !user) {
    throw new Error('not_authenticated');
  }

  return { actorClient, user };
};

const ensureActorIsAdmin = async (
  actorClient: ReturnType<typeof getActorClient>,
  userId: string
) => {
  const { data, error } = await actorClient
    .schema('app')
    .rpc('is_admin', { p_user_id: userId });

  if (error) {
    throw new Error('admin_check_failed');
  }

  if (!data) {
    throw new Error('forbidden');
  }
};

const cleanupCreatedUser = async (userId: string) => {
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    console.error('admin-user-management cleanup failed', error);
  }
};

const cleanupUserReferencesBeforeDelete = async (actorId: string, userId: string) => {
  const profileRefsPromise = adminClient
    .schema('app')
    .from('user_profiles')
    .update({ created_by: actorId })
    .eq('created_by', userId)
    .neq('user_id', userId);

  const profileUpdatedByRefsPromise = adminClient
    .schema('app')
    .from('user_profiles')
    .update({ updated_by: actorId })
    .eq('updated_by', userId)
    .neq('user_id', userId);

  const roleRefsPromise = adminClient
    .schema('app')
    .from('user_roles')
    .update({ granted_by: actorId })
    .eq('granted_by', userId)
    .neq('user_id', userId);

  const registryAssignedRefsPromise = adminClient
    .schema('app')
    .from('username_registry')
    .update({ assigned_by: actorId })
    .eq('assigned_by', userId)
    .neq('user_id', userId);

  const registryRetiredRefsPromise = adminClient
    .schema('app')
    .from('username_registry')
    .update({ retired_by: actorId })
    .eq('retired_by', userId)
    .neq('user_id', userId);

  const historyRefsPromise = adminClient
    .schema('app')
    .from('username_change_history')
    .update({ changed_by: actorId })
    .eq('changed_by', userId)
    .neq('user_id', userId);

  const [profileRefs, profileUpdatedByRefs, roleRefs, registryAssignedRefs, registryRetiredRefs, historyRefs] =
    await Promise.all([
      profileRefsPromise,
      profileUpdatedByRefsPromise,
      roleRefsPromise,
      registryAssignedRefsPromise,
      registryRetiredRefsPromise,
      historyRefsPromise
    ]);

  const referenceError =
    profileRefs.error ||
    profileUpdatedByRefs.error ||
    roleRefs.error ||
    registryAssignedRefs.error ||
    registryRetiredRefs.error ||
    historyRefs.error;

  if (referenceError) {
    throw referenceError;
  }

  const deleteResults = await adminClient
    .from('game_results')
    .delete()
    .eq('user_id', userId);

  if (
    deleteResults.error &&
    !String(deleteResults.error.message || '')
      .toLowerCase()
      .includes('relation "public.game_results" does not exist')
  ) {
    throw deleteResults.error;
  }

  const deleteRoles = await adminClient
    .schema('app')
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  if (deleteRoles.error) {
    throw deleteRoles.error;
  }

  const deleteProfile = await adminClient
    .schema('app')
    .from('user_profiles')
    .delete()
    .eq('user_id', userId);

  if (deleteProfile.error) {
    throw deleteProfile.error;
  }
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }
  return fallback;
};

const createUser = async (
  actorClient: ReturnType<typeof getActorClient>,
  payload: CreateUserPayload
) => {
  const username = normalizeUsername(String(payload.username ?? ''));
  const password = String(payload.password ?? '');
  const playerMode = parsePlayerMode(payload.playerMode ?? 'advanced');

  if (!isValidUsername(username)) {
    return jsonResponse(400, {
      message: 'Formato invalido. Usa entre 3 y 32 caracteres: a-z, 0-9 y _.'
    });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return jsonResponse(400, {
      message: 'La contrasena debe tener al menos 3 caracteres.'
    });
  }

  if (!playerMode) {
    return jsonResponse(400, {
      message: 'El modo de jugador no es valido.'
    });
  }

  const { data: createdUserResult, error: createError } = await adminClient.auth.admin.createUser({
    email: buildInternalEmail(username),
    password,
    email_confirm: true,
    user_metadata: {
      username
    }
  });

  if (createError || !createdUserResult.user) {
    const normalizedMessage = String(createError?.message || '').toLowerCase();
    return jsonResponse(
      normalizedMessage.includes('already been registered') || normalizedMessage.includes('duplicate')
        ? 409
        : 400,
      {
        message:
          normalizedMessage.includes('already been registered') || normalizedMessage.includes('duplicate')
            ? 'Ese usuario ya esta en uso o reservado.'
            : createError?.message || 'No se ha podido crear la cuenta.'
      }
    );
  }

  const createdUser = createdUserResult.user;

  const { data: usernameChange, error: usernameError } = await actorClient
    .schema('app')
    .rpc('admin_change_username', {
      p_user_id: createdUser.id,
      p_new_username: username,
      p_reason: 'admin_create_user',
      p_request_id: crypto.randomUUID(),
      p_metadata: {
        client: 'edge_function',
        actor: 'admin_user_management',
        action: 'create_user'
      }
    })
    .maybeSingle<{
      out_user_id: string;
      out_old_username: string | null;
      out_new_username: string;
      out_changed_at: string;
    }>();

  if (usernameError || !usernameChange) {
    await cleanupCreatedUser(createdUser.id);
    const normalizedMessage = String(usernameError?.message || '').toLowerCase();
    return jsonResponse(
      normalizedMessage.includes('username_already_taken') ? 409 : 400,
      {
        message: normalizedMessage.includes('username_already_taken')
          ? 'Ese usuario ya esta en uso o reservado.'
          : usernameError?.message || 'No se ha podido asignar el usuario a la cuenta nueva.'
      }
    );
  }

  if (playerMode === 'generic') {
    const { data: playerModeResult, error: playerModeError } = await actorClient
      .schema('app')
      .rpc('admin_set_user_player_mode', {
        p_user_id: createdUser.id,
        p_player_mode: playerMode
      })
      .maybeSingle<{
        out_user_id: string;
        out_player_mode: string;
      }>();

    if (playerModeError || !playerModeResult) {
      await cleanupCreatedUser(createdUser.id);
      return jsonResponse(400, {
        message:
          playerModeError?.message || 'No se ha podido asignar el modo de jugador a la cuenta nueva.'
      });
    }
  }

  return jsonResponse(200, {
    user_id: usernameChange.out_user_id,
    current_username: usernameChange.out_new_username,
    auth_email: createdUser.email,
    created_at: createdUser.created_at,
    player_mode: playerMode
  });
};

const deleteUser = async (
  actorId: string,
  actorClient: ReturnType<typeof getActorClient>,
  payload: DeleteUserPayload
) => {
  const userId = String(payload.userId ?? '').trim();

  if (!userId) {
    return jsonResponse(400, {
      message: 'No se ha encontrado el usuario indicado.'
    });
  }

  if (userId === actorId) {
    return jsonResponse(400, {
      message: 'No puedes borrar tu propia cuenta desde el panel de administracion.'
    });
  }

  const { data: currentUsernameRow } = await actorClient
    .schema('app')
    .from('username_registry')
    .select('username')
    .eq('user_id', userId)
    .eq('is_current', true)
    .maybeSingle<{ username: string }>();

  const { data: targetAdminRole } = await actorClient
    .schema('app')
    .from('user_roles')
    .select('user_id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle<{ user_id: string }>();

  if (targetAdminRole?.user_id) {
    return jsonResponse(400, {
      message: 'Las cuentas admin no se pueden borrar desde este panel.'
    });
  }

  try {
    await cleanupUserReferencesBeforeDelete(actorId, userId);
  } catch (cleanupError) {
    const message = getErrorMessage(
      cleanupError,
      'No se han podido preparar los datos del usuario para su eliminacion.'
    );
    return jsonResponse(400, { message });
  }

  let { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteAuthError) {
    console.error('admin-user-management hard delete failed', deleteAuthError);
    const softDeleteAttempt = await adminClient.auth.admin.deleteUser(userId, true);
    deleteAuthError = softDeleteAttempt.error ?? null;
  }

  if (deleteAuthError) {
    const normalizedMessage = String(deleteAuthError.message || '').toLowerCase();
    return jsonResponse(
      normalizedMessage.includes('not found') ? 404 : 400,
      {
        message: normalizedMessage.includes('not found')
          ? 'No se ha encontrado el usuario indicado.'
          : deleteAuthError.message || 'No se ha podido borrar la cuenta.'
      }
    );
  }

  return jsonResponse(200, {
    user_id: userId,
    current_username: currentUsernameRow?.username ?? null,
    warning: null
  });
};

const resetPracticeProgress = async (
  actorId: string,
  actorClient: ReturnType<typeof getActorClient>,
  payload: ResetPracticeProgressPayload
) => {
  const userId = String(payload.userId ?? '').trim();
  const curriculum = String(payload.curriculum ?? '').trim() || null;

  if (!userId) {
    return jsonResponse(400, {
      message: 'No se ha encontrado el usuario indicado.'
    });
  }

  if (userId === actorId) {
    return jsonResponse(400, {
      message: 'No puedes reiniciar tu propio progreso desde el panel de administracion.'
    });
  }

  const { data: currentUsernameRow } = await actorClient
    .schema('app')
    .from('username_registry')
    .select('username')
    .eq('user_id', userId)
    .eq('is_current', true)
    .maybeSingle<{ username: string }>();

  const { data, error } = await actorClient
    .schema('app')
    .rpc('admin_reset_user_practice_progress', {
      p_user_id: userId,
      p_curriculum: curriculum
    })
    .maybeSingle<{
      profiles_reset: number;
      sessions_deleted: number;
      attempts_deleted: number;
      question_stats_deleted: number;
      question_states_deleted: number;
      attempt_events_deleted: number;
    }>();

  if (error || !data) {
    const normalizedMessage = String(error?.message || '').toLowerCase();
    return jsonResponse(
      normalizedMessage.includes('user_not_found') ? 404 : 400,
      {
        message:
          normalizedMessage.includes('cannot_reset_admin_progress')
            ? 'Las cuentas admin no se pueden reiniciar desde este panel.'
            : normalizedMessage.includes('cannot_reset_own_progress')
              ? 'No puedes reiniciar tu propio progreso desde el panel de administracion.'
              : normalizedMessage.includes('user_not_found')
                ? 'No se ha encontrado el usuario indicado.'
                : error?.message || 'No se ha podido reiniciar el progreso del alumno.'
      }
    );
  }

  return jsonResponse(200, {
    user_id: userId,
    current_username: currentUsernameRow?.username ?? null,
    profiles_reset: Number(data.profiles_reset ?? 0),
    sessions_deleted: Number(data.sessions_deleted ?? 0),
    attempts_deleted: Number(data.attempts_deleted ?? 0),
    question_stats_deleted: Number(data.question_stats_deleted ?? 0),
    question_states_deleted: Number(data.question_states_deleted ?? 0),
    attempt_events_deleted: Number(data.attempt_events_deleted ?? 0)
  });
};

const setUserPassword = async (
  actorId: string,
  actorClient: ReturnType<typeof getActorClient>,
  payload: SetUserPasswordPayload
) => {
  const userId = String(payload.userId ?? '').trim();
  const password = String(payload.password ?? '');

  if (!userId) {
    return jsonResponse(400, {
      message: 'No se ha encontrado el usuario indicado.'
    });
  }

  if (userId === actorId) {
    return jsonResponse(400, {
      message: 'No puedes cambiar tu propia contrasena desde este panel.'
    });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return jsonResponse(400, {
      message: 'La contrasena debe tener al menos 3 caracteres.'
    });
  }

  const { data: currentUsernameRow } = await actorClient
    .schema('app')
    .from('username_registry')
    .select('username')
    .eq('user_id', userId)
    .eq('is_current', true)
    .maybeSingle<{ username: string }>();

  const { data: targetAdminRole } = await actorClient
    .schema('app')
    .from('user_roles')
    .select('user_id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle<{ user_id: string }>();

  if (targetAdminRole?.user_id) {
    return jsonResponse(400, {
      message: 'Las cuentas admin no se pueden editar desde este panel.'
    });
  }

  const { data: updatedUserResult, error: updateError } =
    await adminClient.auth.admin.updateUserById(userId, {
      password
    });

  if (updateError || !updatedUserResult.user) {
    const normalizedMessage = String(updateError?.message || '').toLowerCase();
    return jsonResponse(
      normalizedMessage.includes('not found') ? 404 : 400,
      {
        message: normalizedMessage.includes('not found')
          ? 'No se ha encontrado el usuario indicado.'
          : updateError?.message || 'No se ha podido actualizar la contrasena.'
      }
    );
  }

  return jsonResponse(200, {
    user_id: userId,
    current_username: currentUsernameRow?.username ?? null
  });
};

const changeUserUsername = async (
  actorId: string,
  actorClient: ReturnType<typeof getActorClient>,
  payload: ChangeUserUsernamePayload
) => {
  const userId = String(payload.userId ?? '').trim();
  const username = normalizeUsername(String(payload.username ?? ''));
  const reason = String(payload.reason ?? '').trim() || 'admin_panel';
  const requestId = String(payload.requestId ?? '').trim() || crypto.randomUUID();

  if (!userId) {
    return jsonResponse(400, {
      message: 'No se ha encontrado el usuario indicado.'
    });
  }

  if (userId === actorId) {
    return jsonResponse(400, {
      message: 'No puedes cambiar tu propio usuario desde este panel.'
    });
  }

  if (!isValidUsername(username)) {
    return jsonResponse(400, {
      message: 'Formato invalido. Usa entre 3 y 32 caracteres: a-z, 0-9 y _.'
    });
  }

  const { data: targetAdminRole } = await actorClient
    .schema('app')
    .from('user_roles')
    .select('user_id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle<{ user_id: string }>();

  if (targetAdminRole?.user_id) {
    return jsonResponse(400, {
      message: 'Las cuentas admin no se pueden editar desde este panel.'
    });
  }

  const { data, error } = await actorClient
    .schema('app')
    .rpc('admin_change_username', {
      p_user_id: userId,
      p_new_username: username,
      p_reason: reason,
      p_request_id: requestId,
      p_metadata: { client: 'edge_function', actor: 'admin_user_management' }
    })
    .maybeSingle<{
      out_user_id: string;
      out_old_username: string | null;
      out_new_username: string;
      out_changed_at: string;
    }>();

  if (error || !data) {
    const normalizedMessage = String(error?.message || '').toLowerCase();
    return jsonResponse(
      normalizedMessage.includes('username_already_taken') ? 409 : 400,
      {
        message:
          normalizedMessage.includes('username_already_taken')
            ? 'Ese usuario ya esta en uso o reservado.'
            : error?.message || 'No se ha podido actualizar el usuario.'
      }
    );
  }

  let warning: string | null = null;
  const emailSyncResult = await adminClient.auth.admin.updateUserById(userId, {
    email: buildInternalEmail(data.out_new_username),
    email_confirm: true
  });

  if (emailSyncResult.error) {
    console.error('admin-user-management email sync failed', emailSyncResult.error);
    warning = 'El usuario se ha cambiado, pero el email interno de Auth no se ha podido sincronizar.';
  }

  return jsonResponse(200, {
    user_id: data.out_user_id,
    old_username: data.out_old_username ?? null,
    new_username: data.out_new_username,
    changed_at: data.out_changed_at,
    warning
  });
};

const setUserPlayerMode = async (
  actorId: string,
  actorClient: ReturnType<typeof getActorClient>,
  payload: SetUserPlayerModePayload
) => {
  const userId = String(payload.userId ?? '').trim();
  const playerMode = parsePlayerMode(payload.playerMode);

  if (!userId) {
    return jsonResponse(400, {
      message: 'No se ha encontrado el usuario indicado.'
    });
  }

  if (userId === actorId) {
    return jsonResponse(400, {
      message: 'No puedes cambiar tu propio modo desde el panel.'
    });
  }

  if (!playerMode) {
    return jsonResponse(400, {
      message: 'El modo de jugador no es valido.'
    });
  }

  const { data, error } = await actorClient
    .schema('app')
    .rpc('admin_set_user_player_mode', {
      p_user_id: userId,
      p_player_mode: playerMode
    })
    .maybeSingle<{
      out_user_id: string;
      out_current_username: string | null;
      out_player_mode: string;
      out_updated_at: string;
    }>();

  if (error || !data) {
    const normalizedMessage = String(error?.message || '').toLowerCase();
    return jsonResponse(
      normalizedMessage.includes('target_user_not_found') ? 404 : 400,
      {
        message:
          normalizedMessage.includes('target_user_not_found')
            ? 'No se ha encontrado el usuario indicado.'
            : normalizedMessage.includes('cannot_edit_admin_account')
              ? 'Las cuentas admin no se pueden editar desde este panel.'
              : normalizedMessage.includes('cannot_set_own_player_mode_from_admin')
                ? 'No puedes cambiar tu propio modo desde el panel.'
                : normalizedMessage.includes('invalid_player_mode')
                  ? 'El modo de jugador no es valido.'
                  : error?.message || 'No se ha podido actualizar el modo del alumno.'
      }
    );
  }

  return jsonResponse(200, {
    user_id: data.out_user_id,
    current_username: data.out_current_username ?? null,
    player_mode: data.out_player_mode,
    updated_at: data.out_updated_at
  });
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { message: 'Method not allowed' });
  }

  const authorizationHeader = request.headers.get('Authorization');
  if (!authorizationHeader) {
    return jsonResponse(401, { message: 'La sesion no es valida. Vuelve a iniciar sesion.' });
  }

  try {
    const payload = (await request.json()) as RequestPayload;
    const { actorClient, user } = await getActorUser(authorizationHeader);
    await ensureActorIsAdmin(actorClient, user.id);

    if (payload.action === 'create_user') {
      return await createUser(actorClient, payload);
    }

    if (payload.action === 'delete_user') {
      return await deleteUser(user.id, actorClient, payload);
    }

    if (payload.action === 'reset_practice_progress') {
      return await resetPracticeProgress(user.id, actorClient, payload);
    }

    if (payload.action === 'set_user_password') {
      return await setUserPassword(user.id, actorClient, payload);
    }

    if (payload.action === 'change_user_username') {
      return await changeUserUsername(user.id, actorClient, payload);
    }

    if (payload.action === 'set_user_player_mode') {
      return await setUserPlayerMode(user.id, actorClient, payload);
    }

    return jsonResponse(400, { message: 'Accion no valida.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';

    if (message === 'not_authenticated') {
      return jsonResponse(401, { message: 'La sesion no es valida. Vuelve a iniciar sesion.' });
    }

    if (message === 'forbidden') {
      return jsonResponse(403, { message: 'No tienes permisos para realizar esta accion.' });
    }

    console.error('admin-user-management error', error);
    return jsonResponse(500, { message: 'No se ha podido completar la accion de administracion.' });
  }
});
