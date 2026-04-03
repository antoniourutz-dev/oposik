import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  HighlightBlockType,
  HighlightOverrideRecord,
} from '../domain/highlighting/highlightTypes';
import { getQuestionHighlightOverrides } from '../services/highlightAdminApi';

const questionHighlightOverridesQueryKey = (questionId: number | null) =>
  ['highlight-overrides', questionId ?? 'none'] as const;

export const findHighlightOverrideForBlock = (
  records: HighlightOverrideRecord[] | null | undefined,
  contentType: HighlightBlockType,
  answerIndex: number | null = null,
) =>
  (records ?? []).find(
    (record) =>
      record.contentType === contentType &&
      (record.answerIndex ?? null) === (answerIndex ?? null) &&
      record.isActive,
  ) ?? null;

export const useQuestionHighlightOverrides = (questionId: number | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: questionHighlightOverridesQueryKey(questionId),
    queryFn: () => getQuestionHighlightOverrides(questionId ?? 0),
    enabled: Number.isSafeInteger(questionId) && (questionId ?? 0) > 0,
    staleTime: 30_000,
    retry: 1,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: questionHighlightOverridesQueryKey(questionId),
    });
    return query.refetch();
  }, [query, queryClient, questionId]);

  return {
    data: (query.data ?? []) as HighlightOverrideRecord[],
    loading: query.isLoading || query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
};

export const questionHighlightOverrideQueryKeys = {
  byQuestion: questionHighlightOverridesQueryKey,
};
