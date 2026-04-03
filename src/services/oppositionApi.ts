import { supabase } from '../supabaseClient';
import { trackAsyncOperation } from '../telemetry/telemetryClient';
import {
  mapActiveOppositionContext,
  mapOppositionOption,
} from '../lib/oppositions/mapActiveOppositionContext';
import type { ActiveOppositionContext, OppositionOption } from '../domain/oppositions/types';

const getErrorMessage = (error: { message?: string | null }) =>
  String(error.message ?? 'No se ha podido completar la operacion.').trim();

export const getMyActiveOppositionContext = async (): Promise<ActiveOppositionContext | null> => {
  return trackAsyncOperation('oppositions.getMyActiveOppositionContext', async () => {
    const { data, error } = await supabase
      .schema('public')
      .rpc('get_my_active_opposition_context')

    if (error) {
      const status = Number((error as { status?: number }).status ?? 0);
      const code = String(error.code ?? '');
      const message = String(error.message ?? '').toLowerCase();
      if (status === 406 || code === '406' || message.includes('not acceptable')) {
        return null;
      }
      throw new Error(getErrorMessage(error));
    }

    const row = Array.isArray(data) ? data[0] ?? null : data;
    return mapActiveOppositionContext(row);
  });
};

export const listActiveOppositions = async (): Promise<OppositionOption[]> => {
  return trackAsyncOperation('oppositions.listActiveOppositions', async () => {
    const { data: oppositionsData, error: oppositionsError } = await supabase
      .schema('public')
      .from('oppositions')
      .select('*');

    if (oppositionsError) {
      throw new Error(getErrorMessage(oppositionsError));
    }

    const mapped = ((oppositionsData ?? []) as Array<Record<string, unknown>>)
      .map((row) => {
        const base = mapOppositionOption(row);
        if (!base) return null;
        return base;
      })
      .filter((item): item is OppositionOption => Boolean(item))

    return mapped
      .filter((item) => item.isActive)
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  });
};

export const setActiveOppositionContext = async ({
  userId,
  oppositionId,
}: {
  userId: string;
  oppositionId: string;
}) => {
  return trackAsyncOperation(
    'oppositions.setActiveOppositionContext',
    async () => {
      const normalizedUserId = String(userId ?? '').trim();
      const normalizedOppositionId = String(oppositionId ?? '').trim();
      if (!normalizedUserId || !normalizedOppositionId) {
        throw new Error('Falta usuario u oposicion para actualizar el contexto.');
      }

      const now = new Date().toISOString();

      const { data: currentRows, error: loadError } = await supabase
        .schema('public')
        .from('user_opposition_profiles')
        .select('id, opposition_id')
        .eq('user_id', normalizedUserId);

      if (loadError) {
        throw new Error(getErrorMessage(loadError));
      }

      const existingTarget = (currentRows ?? []).find(
        (row) => String((row as Record<string, unknown>).opposition_id ?? '').trim() === normalizedOppositionId,
      ) as Record<string, unknown> | undefined;

      const deactivateOthers = supabase
        .schema('public')
        .from('user_opposition_profiles')
        .update({ is_active_context: false, is_primary: false })
        .eq('user_id', normalizedUserId)
        .neq('opposition_id', normalizedOppositionId);

      const activateTarget = existingTarget?.id
        ? supabase
            .schema('public')
            .from('user_opposition_profiles')
            .update({
              is_active_context: true,
              is_primary: true,
              updated_at: now,
            })
            .eq('id', String(existingTarget.id))
        : supabase.schema('public').from('user_opposition_profiles').insert({
            user_id: normalizedUserId,
            opposition_id: normalizedOppositionId,
            is_active_context: true,
            is_primary: true,
            onboarding_completed: false,
            started_at: now,
            updated_at: now,
          });

      const [deactivateResult, activateResult] = await Promise.all([deactivateOthers, activateTarget]);
      if (deactivateResult.error) {
        throw new Error(getErrorMessage(deactivateResult.error));
      }
      if (activateResult.error) {
        throw new Error(getErrorMessage(activateResult.error));
      }

      return activateResult.data ?? null;
    },
    { userId, oppositionId },
  );
};
