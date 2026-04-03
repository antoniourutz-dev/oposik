import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LearningContextOption } from '../domain/learningContext/types';
import {
  listAvailableLearningContexts,
  setActiveLearningContext,
} from '../services/learningContextApi';
import { activeLearningContextQueryKeys } from './useActiveLearningContext';

const learningContextListQueryKey = ['learning-context', 'available-list'] as const;

export const useLearningContextSelector = (userId: string | null) => {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: learningContextListQueryKey,
    queryFn: () => listAvailableLearningContexts(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: (context: LearningContextOption) => {
      if (!userId) {
        throw new Error('No hay usuario autenticado.');
      }
      return setActiveLearningContext({ userId, context });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: learningContextListQueryKey }),
        queryClient.invalidateQueries({
          queryKey: activeLearningContextQueryKeys.activeContext(userId),
        }),
      ]);
    },
  });

  const contexts = useMemo(
    () => ((listQuery.data ?? []) as LearningContextOption[]).filter((item) => item.isActive),
    [listQuery.data],
  );

  const selectLearningContext = useCallback(
    async (context: LearningContextOption) => {
      await mutation.mutateAsync(context);
    },
    [mutation],
  );

  return {
    contexts,
    loading: listQuery.isLoading || listQuery.isFetching,
    error: listQuery.error instanceof Error ? listQuery.error.message : null,
    saving: mutation.isPending,
    selectLearningContext,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: learningContextListQueryKey });
      await listQuery.refetch();
    },
  };
};
