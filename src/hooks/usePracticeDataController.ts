import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PracticeQuestionScopeFilter } from '../practiceTypes';
import {
  loadPracticeAccountSnapshot,
  loadPracticeScopeSnapshot,
} from '../services/practiceBootstrapApi';
import { upsertMyExamTarget } from '../services/practiceCloudApi';
import { practiceQueryKeys } from '../services/practiceQueryKeys';
import { trackAsyncOperation } from '../telemetry/telemetryClient';

type PracticeExamTargetPayload = {
  examDate: string | null;
  dailyReviewCapacity: number;
  dailyNewCapacity: number;
};

type UsePracticeDataControllerOptions = {
  authReady: boolean;
  curriculum: string | null;
  isGuest: boolean;
  selectedQuestionScope: PracticeQuestionScopeFilter;
  sessionUserId: string | null;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/** No reintentar si ya falló por timeout local (evita duplicar 25s+ de espera). */
const shouldRetryRemoteQuery = (failureCount: number, error: unknown) => {
  const m = error instanceof Error ? error.message : '';
  if (/tiempo de espera agotado/i.test(m)) return false;
  return failureCount < 1;
};

export const usePracticeDataController = ({
  authReady,
  curriculum,
  isGuest,
  selectedQuestionScope,
  sessionUserId,
}: UsePracticeDataControllerOptions) => {
  const queryClient = useQueryClient();
  const [manualLoadingQuestions, setManualLoadingQuestions] = useState(false);
  const [questionsErrorOverride, setQuestionsErrorOverride] = useState<string | null>(null);
  const [syncErrorOverride, setSyncErrorOverride] = useState<string | null>(null);

  const userId = sessionUserId ?? 'anonymous';
  const currentCurriculum = curriculum ?? 'pending-opposition';
  const queriesEnabled = authReady && !isGuest && Boolean(sessionUserId) && Boolean(curriculum);
  const accountQueryKey = practiceQueryKeys.account(userId, currentCurriculum);
  const scopeRootQueryKey = practiceQueryKeys.scopeRoot(userId, currentCurriculum);
  const scopeQueryKey = practiceQueryKeys.scope(userId, currentCurriculum, selectedQuestionScope);

  const accountQuery = useQuery({
    queryKey: accountQueryKey,
    queryFn: () => loadPracticeAccountSnapshot(currentCurriculum),
    enabled: queriesEnabled,
    staleTime: 30_000,
    retry: shouldRetryRemoteQuery,
  });

  const scopeQuery = useQuery({
    queryKey: scopeQueryKey,
    queryFn: () => loadPracticeScopeSnapshot(currentCurriculum, selectedQuestionScope),
    enabled: queriesEnabled,
    staleTime: 30_000,
    retry: shouldRetryRemoteQuery,
  });

  const saveExamTargetMutation = useMutation({
    mutationFn: ({ examDate, dailyReviewCapacity, dailyNewCapacity }: PracticeExamTargetPayload) =>
      upsertMyExamTarget({
        curriculum: currentCurriculum,
        examDate,
        dailyReviewCapacity,
        dailyNewCapacity,
      }),
    onSuccess: async () => {
      if (!sessionUserId) return;
      await queryClient.invalidateQueries({ queryKey: accountQueryKey });
    },
  });

  useEffect(() => {
    setQuestionsErrorOverride(null);
  }, [selectedQuestionScope]);

  useEffect(() => {
    if (queriesEnabled) {
      return;
    }

    setManualLoadingQuestions(false);
    setQuestionsErrorOverride(null);
    setSyncErrorOverride(null);
  }, [queriesEnabled]);

  const clearAccountContext = useCallback(() => {
    setManualLoadingQuestions(false);
    setQuestionsErrorOverride(null);
    setSyncErrorOverride(null);
    queryClient.removeQueries({ queryKey: practiceQueryKeys.root });
  }, [queryClient]);

  const reloadPracticeData = useCallback(async () => {
    if (!sessionUserId) return;

    setManualLoadingQuestions(true);
    setQuestionsErrorOverride(null);
    setSyncErrorOverride(null);

    try {
      await trackAsyncOperation(
        'practice.reloadPracticeData',
        async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: accountQueryKey }),
            queryClient.invalidateQueries({ queryKey: scopeQueryKey }),
          ]);
        },
        { questionScope: selectedQuestionScope },
      );
    } finally {
      setManualLoadingQuestions(false);
    }
  }, [accountQueryKey, queryClient, scopeQueryKey, selectedQuestionScope, sessionUserId]);

  const syncPracticeAfterSession = useCallback(
    async (_questionScope: PracticeQuestionScopeFilter) => {
      if (!sessionUserId) return;

      setSyncErrorOverride(null);

      try {
        await trackAsyncOperation(
          'practice.syncPracticeAfterSession',
          async () => {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: accountQueryKey }),
              queryClient.invalidateQueries({ queryKey: scopeRootQueryKey }),
            ]);
          },
          { questionScope: _questionScope },
        );
      } catch (error) {
        const message = getErrorMessage(error, 'No se ha podido sincronizar el progreso.');
        setSyncErrorOverride(message);
        throw error;
      }
    },
    [accountQueryKey, queryClient, scopeRootQueryKey, sessionUserId],
  );

  const handleSaveExamTarget = useCallback(
    async ({ examDate, dailyReviewCapacity, dailyNewCapacity }: PracticeExamTargetPayload) => {
      try {
        await saveExamTargetMutation.mutateAsync({
          examDate,
          dailyReviewCapacity,
          dailyNewCapacity,
        });
      } catch {
        return;
      }
    },
    [saveExamTargetMutation],
  );

  const identity = queriesEnabled ? (accountQuery.data?.identity ?? null) : null;
  const practiceState = accountQuery.data?.practiceState ?? null;
  const scopeSnapshot = scopeQuery.data ?? null;

  const profile = practiceState?.profile ?? null;
  const recentSessions = practiceState?.recentSessions ?? [];
  const learningDashboard = practiceState?.learningDashboard ?? null;
  const learningDashboardV2 = practiceState?.learningDashboardV2 ?? null;
  const examTarget = practiceState?.examTarget ?? null;
  const pressureInsights = practiceState?.pressureInsights ?? null;
  const pressureInsightsV2 = practiceState?.pressureInsightsV2 ?? null;

  const questionsCount = scopeSnapshot?.questionsCount ?? 0;
  const weakQuestions = scopeSnapshot?.weakQuestions ?? [];
  const weakCategories = scopeSnapshot?.weakCategories ?? [];
  const loadedQuestionScope = scopeSnapshot ? selectedQuestionScope : null;

  const syncingState = queriesEnabled && !accountQuery.data && accountQuery.isFetching;
  const loadingQuestions =
    manualLoadingQuestions || (queriesEnabled && !scopeSnapshot && scopeQuery.isFetching);

  const syncError = useMemo(() => {
    if (syncErrorOverride) return syncErrorOverride;
    if (accountQuery.error) {
      return getErrorMessage(accountQuery.error, 'No se ha podido sincronizar la cuenta.');
    }
    return accountQuery.data?.syncError ?? null;
  }, [accountQuery.data?.syncError, accountQuery.error, syncErrorOverride]);

  const questionsError = useMemo(() => {
    if (questionsErrorOverride) return questionsErrorOverride;
    if (scopeQuery.error) {
      return getErrorMessage(scopeQuery.error, 'No se ha podido cargar el catalogo seleccionado.');
    }
    return scopeSnapshot?.questionsError ?? null;
  }, [questionsErrorOverride, scopeQuery.error, scopeSnapshot]);

  const examTargetError = saveExamTargetMutation.error
    ? getErrorMessage(
        saveExamTargetMutation.error,
        'No se ha podido guardar la configuracion del examen.',
      )
    : null;

  return {
    clearAccountContext,
    examTarget,
    examTargetError,
    handleSaveExamTarget,
    identity,
    learningDashboard,
    learningDashboardV2,
    loadedQuestionScope,
    loadingQuestions,
    pressureInsights,
    pressureInsightsV2,
    profile,
    questionsCount,
    questionsError,
    recentSessions,
    reloadPracticeData,
    savingExamTarget: saveExamTargetMutation.isPending,
    setLoadingQuestions: setManualLoadingQuestions,
    setQuestionsError: setQuestionsErrorOverride,
    setSyncError: setSyncErrorOverride,
    syncPracticeAfterSession,
    syncingState,
    syncError,
    weakCategories,
    weakQuestions,
  };
};
