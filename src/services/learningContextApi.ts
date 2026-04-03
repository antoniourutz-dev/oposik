import { supabase } from '../supabaseClient';
import { trackAsyncOperation } from '../telemetry/telemetryClient';
import { buildGeneralLawLearningContextOption } from '../domain/learningContext/catalog';
import type {
  ActiveLearningContext,
  LearningContextOption,
} from '../domain/learningContext/types';
import {
  clearStoredLearningContextSelection,
  readStoredLearningContextSelection,
  writeStoredLearningContextSelection,
} from '../lib/learningContext/activeLearningContextStorage';
import {
  mapActiveLearningContext,
  mapLearningContextOption,
} from '../lib/learningContext/mapActiveLearningContext';

const getErrorMessage = (error: { message?: string | null }) =>
  String(error.message ?? 'No se ha podido completar la operacion.').trim();

const loadRemoteActiveOppositionContext = async () => {
  const { data, error } = await supabase.schema('public').rpc('get_my_active_opposition_context');

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
  return mapActiveLearningContext(row);
};

export const getMyActiveLearningContext = async (
  userId: string | null,
): Promise<ActiveLearningContext | null> => {
  return trackAsyncOperation('learningContext.getMyActiveLearningContext', async () => {
    const stored = readStoredLearningContextSelection(userId);
    if (stored) return stored;
    return loadRemoteActiveOppositionContext();
  });
};

export const listAvailableLearningContexts = async (): Promise<LearningContextOption[]> => {
  return trackAsyncOperation('learningContext.listAvailableLearningContexts', async () => {
    const { data, error } = await supabase.schema('public').from('oppositions').select('*');
    if (error) {
      throw new Error(getErrorMessage(error));
    }

    const oppositionOptions = ((data ?? []) as Array<Record<string, unknown>>)
      .map((row) => mapLearningContextOption(row))
      .filter((item): item is LearningContextOption => Boolean(item))
      .filter((item) => item.isActive)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'es', { sensitivity: 'base' }));

    return [...oppositionOptions, buildGeneralLawLearningContextOption()];
  });
};

export const setActiveLearningContext = async ({
  userId,
  context,
}: {
  userId: string;
  context: LearningContextOption;
}) => {
  return trackAsyncOperation(
    'learningContext.setActiveLearningContext',
    async () => {
      const normalizedUserId = String(userId ?? '').trim();
      if (!normalizedUserId) {
        throw new Error('No hay usuario autenticado.');
      }

      if (context.contextType === 'general_law') {
        writeStoredLearningContextSelection(normalizedUserId, {
          contextId: context.contextId,
          contextType: context.contextType,
          displayName: context.displayName,
          shortName: context.shortName,
          code: context.code,
          curriculumKey: context.curriculumKey ?? 'leyes_generales',
          themeKey: context.themeKey,
          configJson: context.configJson,
          examDate: null,
          onboardingCompleted: true,
          source: 'local',
          config: context.config,
        });
        return null;
      }

      clearStoredLearningContextSelection(normalizedUserId);

      const normalizedContextId = String(context.contextId ?? '').trim();
      if (!normalizedContextId) {
        throw new Error('Falta la oposicion para actualizar el contexto.');
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
        (row) =>
          String((row as Record<string, unknown>).opposition_id ?? '').trim() === normalizedContextId,
      ) as Record<string, unknown> | undefined;

      const deactivateOthers = supabase
        .schema('public')
        .from('user_opposition_profiles')
        .update({ is_active_context: false, is_primary: false })
        .eq('user_id', normalizedUserId)
        .neq('opposition_id', normalizedContextId);

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
            opposition_id: normalizedContextId,
            is_active_context: true,
            is_primary: true,
            onboarding_completed: false,
            started_at: now,
            updated_at: now,
          });

      const [deactivateResult, activateResult] = await Promise.all([
        deactivateOthers,
        activateTarget,
      ]);
      if (deactivateResult.error) {
        throw new Error(getErrorMessage(deactivateResult.error));
      }
      if (activateResult.error) {
        throw new Error(getErrorMessage(activateResult.error));
      }

      return activateResult.data ?? null;
    },
    { userId, contextId: context.contextId, contextType: context.contextType },
  );
};
