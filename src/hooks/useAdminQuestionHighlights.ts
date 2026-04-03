import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  HighlightBlockType,
  HighlightOverrideRecord,
  HighlightSpan,
} from '../domain/highlighting/highlightTypes';
import {
  disableHighlightOverride,
  getQuestionHighlightOverrides,
  restoreAutomaticHighlights,
  saveManualHighlightOverride,
} from '../services/highlightAdminApi';
import { questionHighlightOverrideQueryKeys } from './useQuestionHighlightOverrides';

export const useAdminQuestionHighlights = ({
  questionId,
  currentUserId,
}: {
  questionId: number | null;
  currentUserId: string | null;
}) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: questionHighlightOverrideQueryKeys.byQuestion(questionId),
    queryFn: () => getQuestionHighlightOverrides(questionId ?? 0),
    enabled: Number.isSafeInteger(questionId) && (questionId ?? 0) > 0,
    staleTime: 0,
    retry: 1,
  });

  const invalidateQuestion = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: questionHighlightOverrideQueryKeys.byQuestion(questionId),
    });
  }, [queryClient, questionId]);

  const saveManualMutation = useMutation({
    mutationFn: (input: {
      contentType: HighlightBlockType;
      answerIndex?: number | null;
      spans: HighlightSpan[];
    }) => {
      if (!questionId || !currentUserId) {
        throw new Error('Faltan datos para guardar el override manual.');
      }

      return saveManualHighlightOverride({
        questionId,
        contentType: input.contentType,
        answerIndex: input.answerIndex ?? null,
        spans: input.spans,
        userId: currentUserId,
      });
    },
    onSuccess: async () => {
      await invalidateQuestion();
    },
  });

  const disableMutation = useMutation({
    mutationFn: (input: {
      contentType: HighlightBlockType;
      answerIndex?: number | null;
    }) => {
      if (!questionId || !currentUserId) {
        throw new Error('Faltan datos para desactivar highlights.');
      }

      return disableHighlightOverride({
        questionId,
        contentType: input.contentType,
        answerIndex: input.answerIndex ?? null,
        userId: currentUserId,
      });
    },
    onSuccess: async () => {
      await invalidateQuestion();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (input: {
      contentType: HighlightBlockType;
      answerIndex?: number | null;
    }) => {
      if (!questionId || !currentUserId) {
        throw new Error('Faltan datos para restaurar el resaltado automatico.');
      }

      return restoreAutomaticHighlights({
        questionId,
        contentType: input.contentType,
        answerIndex: input.answerIndex ?? null,
        userId: currentUserId,
      });
    },
    onSuccess: async () => {
      await invalidateQuestion();
    },
  });

  const refresh = useCallback(async () => {
    await invalidateQuestion();
    return query.refetch();
  }, [invalidateQuestion, query]);

  return {
    data: (query.data ?? []) as HighlightOverrideRecord[],
    loading: query.isLoading || query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    saving:
      saveManualMutation.isPending || disableMutation.isPending || restoreMutation.isPending,
    saveManual: saveManualMutation.mutateAsync,
    disableBlock: disableMutation.mutateAsync,
    restoreAutomatic: restoreMutation.mutateAsync,
    refresh,
  };
};
