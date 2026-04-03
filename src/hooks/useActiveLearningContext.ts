import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActiveLearningContext } from '../domain/learningContext/types';
import { getMyActiveLearningContext } from '../services/learningContextApi';

const activeLearningContextQueryKey = (userId: string | null) =>
  ['learning-context', 'active-context', userId ?? 'anonymous'] as const;

export const useActiveLearningContext = (userId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: activeLearningContextQueryKey(userId),
    queryFn: () => getMyActiveLearningContext(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
    retry: 1,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: activeLearningContextQueryKey(userId) });
    return query.refetch();
  }, [query, queryClient, userId]);

  return {
    data: (query.data ?? null) as ActiveLearningContext | null,
    loading: query.isLoading || query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
};

export const activeLearningContextQueryKeys = {
  activeContext: activeLearningContextQueryKey,
};
