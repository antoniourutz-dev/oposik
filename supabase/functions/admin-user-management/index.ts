import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type CreateUserPayload = {
  action: 'create_user';
  username?: string;
  password?: string;
};

type DeleteUserPayload = {
  action: 'delete_user';
  userId?: string;
};

type RequestPayload = CreateUserPayload | DeleteUserPayload;

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_]{1,30}[a-z0-9])?$/;
const MIN_PASSWORD_LENGTH = 3;

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
const buildInternalEmail = (username: string) => `${username}@oposik.app`;

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

  if (deleteResults.error) {
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

  return jsonResponse(200, {
    user_id: usernameChange.out_user_id,
    current_username: usernameChange.out_new_username,
    auth_email: createdUser.email,
    created_at: createdUser.created_at
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
