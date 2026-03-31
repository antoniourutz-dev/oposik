import type { AccountIdentity } from './accountApi';
import { getMyAccountIdentity } from './accountApi';
import { DEFAULT_CURRICULUM, PRACTICE_REMOTE_RPC_TIMEOUT_MS, WEAK_QUESTIONS_LIMIT } from '../practiceConfig';
import { withTimeout } from '../utils/withTimeout';
import type {
  PracticeCategoryRiskSummary,
  CloudPracticeState,
  PracticeQuestionScopeFilter,
  WeakQuestionInsight,
} from '../practiceTypes';
import {
  getPracticeCatalogSummary,
  getWeakCategorySummary,
  getWeakPracticeInsights,
} from './preguntasApi';
import {
  getMyLearningDashboardV2,
  getMyPracticeState,
  getMyPressureDashboardV2,
} from './practiceCloudApi';
import { trackAsyncOperation } from '../telemetry/telemetryClient';

export type PracticeAccountSnapshot = {
  identity: AccountIdentity;
  practiceState: CloudPracticeState;
  syncError: string | null;
};

export type PracticeBootstrap = PracticeAccountSnapshot & {
  questionsCount: number;
  weakQuestions: WeakQuestionInsight[];
  weakCategories: PracticeCategoryRiskSummary[];
  questionsError: string | null;
};

export type PracticeScopeSnapshot = {
  questionsCount: number;
  weakQuestions: WeakQuestionInsight[];
  weakCategories: PracticeCategoryRiskSummary[];
  questionsError: string | null;
};

export const createEmptyPracticeState = (): CloudPracticeState => ({
  profile: null,
  recentSessions: [],
  learningDashboard: null,
  learningDashboardV2: null,
  examTarget: null,
  pressureInsights: null,
  pressureInsightsV2: null,
});

const loadPracticeScopeInsights = async (
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all',
) => {
  return trackAsyncOperation(
    'practice.loadPracticeScopeInsights',
    async () => {
      const [weakQuestionsResult, weakCategoriesResult] = await Promise.allSettled([
        getWeakPracticeInsights(curriculum, WEAK_QUESTIONS_LIMIT, questionScope),
        getWeakCategorySummary(curriculum, 5, questionScope),
      ]);

      return {
        weakQuestions: weakQuestionsResult.status === 'fulfilled' ? weakQuestionsResult.value : [],
        weakCategories:
          weakCategoriesResult.status === 'fulfilled' ? weakCategoriesResult.value : [],
      };
    },
    { curriculum, questionScope },
  );
};

export const loadPracticeAccountSnapshot = async (
  curriculum = DEFAULT_CURRICULUM,
): Promise<PracticeAccountSnapshot> => {
  return trackAsyncOperation(
    'practice.loadPracticeAccountSnapshot',
    async () => {
      const tid = PRACTICE_REMOTE_RPC_TIMEOUT_MS;
      const [identityResult, practiceResult, learningDashboardV2Result, pressureInsightsV2Result] =
        await Promise.allSettled([
          withTimeout(getMyAccountIdentity(), tid, 'Identidad: tiempo de espera agotado.'),
          withTimeout(getMyPracticeState(curriculum), tid, 'Progreso: tiempo de espera agotado.'),
          withTimeout(getMyLearningDashboardV2(curriculum), tid, 'Dashboard: tiempo de espera agotado.'),
          withTimeout(getMyPressureDashboardV2(curriculum), tid, 'Presion: tiempo de espera agotado.'),
        ]);

      if (identityResult.status === 'rejected') {
        throw identityResult.reason;
      }

      const identity = identityResult.value;
      if (!identity) {
        throw new Error('No se ha podido obtener la identidad de la cuenta.');
      }

      return {
        identity,
        practiceState: {
          ...(practiceResult.status === 'fulfilled'
            ? practiceResult.value
            : createEmptyPracticeState()),
          learningDashboardV2:
            learningDashboardV2Result.status === 'fulfilled'
              ? learningDashboardV2Result.value
              : null,
          pressureInsightsV2:
            pressureInsightsV2Result.status === 'fulfilled' ? pressureInsightsV2Result.value : null,
        },
        syncError:
          practiceResult.status === 'rejected'
            ? practiceResult.reason instanceof Error
              ? practiceResult.reason.message
              : 'No se ha podido sincronizar el progreso.'
            : null,
      };
    },
    { curriculum },
  );
};

export const loadPracticeScopeSnapshot = async (
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all',
): Promise<PracticeScopeSnapshot> => {
  return trackAsyncOperation(
    'practice.loadPracticeScopeSnapshot',
    async () => {
      const tid = PRACTICE_REMOTE_RPC_TIMEOUT_MS;
      const [catalogResult, scopeInsightsResult] = await Promise.allSettled([
        withTimeout(
          getPracticeCatalogSummary(curriculum, questionScope),
          tid,
          'Catálogo: tiempo de espera agotado.',
        ),
        withTimeout(
          loadPracticeScopeInsights(curriculum, questionScope),
          tid,
          'Rendimiento por tema: tiempo de espera agotado.',
        ),
      ]);

      const scopeInsights =
        scopeInsightsResult.status === 'fulfilled'
          ? scopeInsightsResult.value
          : {
              weakQuestions: [],
              weakCategories: [],
            };

      return {
        questionsCount:
          catalogResult.status === 'fulfilled' ? catalogResult.value.totalQuestions : 0,
        weakQuestions: scopeInsights.weakQuestions,
        weakCategories: scopeInsights.weakCategories,
        questionsError:
          catalogResult.status === 'rejected'
            ? catalogResult.reason instanceof Error
              ? catalogResult.reason.message
              : 'No se ha podido cargar el catalogo de preguntas.'
            : null,
      };
    },
    { curriculum, questionScope },
  );
};

export const loadPracticeBootstrap = async (
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all',
): Promise<PracticeBootstrap> => {
  return trackAsyncOperation(
    'practice.loadPracticeBootstrap',
    async () => {
      const [accountSnapshotResult, scopeSnapshotResult] = await Promise.allSettled([
        loadPracticeAccountSnapshot(curriculum),
        loadPracticeScopeSnapshot(curriculum, questionScope),
      ]);

      if (accountSnapshotResult.status === 'rejected') {
        throw accountSnapshotResult.reason;
      }

      const scopeSnapshot =
        scopeSnapshotResult.status === 'fulfilled'
          ? scopeSnapshotResult.value
          : {
              questionsCount: 0,
              weakQuestions: [],
              weakCategories: [],
              questionsError:
                scopeSnapshotResult.reason instanceof Error
                  ? scopeSnapshotResult.reason.message
                  : 'No se ha podido cargar el catalogo de preguntas.',
            };

      return {
        ...accountSnapshotResult.value,
        questionsCount: scopeSnapshot.questionsCount,
        weakQuestions: scopeSnapshot.weakQuestions,
        weakCategories: scopeSnapshot.weakCategories,
        questionsError: scopeSnapshot.questionsError,
      };
    },
    { curriculum, questionScope },
  );
};

export const refreshPracticeAfterSession = async (
  curriculum = DEFAULT_CURRICULUM,
  questionScope: PracticeQuestionScopeFilter = 'all',
) => {
  return trackAsyncOperation(
    'practice.refreshPracticeAfterSession',
    async () => {
      const [practiceState, scopeInsights] = await Promise.all([
        getMyPracticeState(curriculum),
        loadPracticeScopeInsights(curriculum, questionScope),
      ]);

      return {
        practiceState,
        weakQuestions: scopeInsights.weakQuestions,
        weakCategories: scopeInsights.weakCategories,
      };
    },
    { curriculum, questionScope },
  );
};
