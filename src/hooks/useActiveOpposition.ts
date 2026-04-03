import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActiveOppositionContext } from '../domain/oppositions/types';
import { getMyActiveOppositionContext } from '../services/oppositionApi';

const activeOppositionQueryKey = (userId: string | null) =>
  ['oppositions', 'active-context', userId ?? 'anonymous'] as const;

export const useActiveOpposition = (userId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: activeOppositionQueryKey(userId),
    queryFn: () => getMyActiveOppositionContext(),
    enabled: Boolean(userId),
    staleTime: 30_000,
    retry: 1,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: activeOppositionQueryKey(userId) });
    return query.refetch();
  }, [query, queryClient, userId]);

  return {
    data: (query.data ?? null) as ActiveOppositionContext | null,
    loading: query.isLoading || query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
};

export const activeOppositionQueryKeys = {
  activeContext: activeOppositionQueryKey,
};
