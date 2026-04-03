import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OppositionOption } from '../domain/oppositions/types';
import { listActiveOppositions, setActiveOppositionContext } from '../services/oppositionApi';
import { activeOppositionQueryKeys } from './useActiveOpposition';

const oppositionListQueryKey = ['oppositions', 'active-list'] as const;

export const useOppositionSelector = (userId: string | null) => {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: oppositionListQueryKey,
    queryFn: () => listActiveOppositions(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: (oppositionId: string) => {
      if (!userId) {
        throw new Error('No hay usuario autenticado.');
      }
      return setActiveOppositionContext({ userId, oppositionId });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: oppositionListQueryKey }),
        queryClient.invalidateQueries({ queryKey: activeOppositionQueryKeys.activeContext(userId) }),
      ]);
    },
  });

  const oppositions = useMemo(
    () => ((listQuery.data ?? []) as OppositionOption[]).filter((item) => item.isActive),
    [listQuery.data],
  );

  const selectOpposition = useCallback(
    async (oppositionId: string) => {
      await mutation.mutateAsync(oppositionId);
    },
    [mutation],
  );

  return {
    oppositions,
    loading: listQuery.isLoading || listQuery.isFetching,
    error: listQuery.error instanceof Error ? listQuery.error.message : null,
    saving: mutation.isPending,
    selectOpposition,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: oppositionListQueryKey });
      await listQuery.refetch();
    },
  };
};
