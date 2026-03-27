import type { AccountIdentity } from './accountApi';
import { getMyAccountIdentity } from './accountApi';
import { DEFAULT_CURRICULUM, WEAK_QUESTIONS_LIMIT } from '../practiceConfig';
import type { CloudPracticeState, WeakQuestionInsight } from '../practiceTypes';
import { getPracticeCatalogSummary, getWeakPracticeInsights } from './preguntasApi';
import { getMyPracticeState } from './practiceCloudApi';

export type PracticeBootstrap = {
  identity: AccountIdentity;
  practiceState: CloudPracticeState;
  questionsCount: number;
  weakQuestions: WeakQuestionInsight[];
  syncError: string | null;
  questionsError: string | null;
};

export const createEmptyPracticeState = (): CloudPracticeState => ({
  profile: null,
  recentSessions: [],
  questionStats: []
});

export const loadPracticeBootstrap = async (
  curriculum = DEFAULT_CURRICULUM
): Promise<PracticeBootstrap> => {
  const [identityResult, practiceResult, catalogResult, weakQuestionsResult] =
    await Promise.allSettled([
      getMyAccountIdentity(),
      getMyPracticeState(curriculum),
      getPracticeCatalogSummary(curriculum),
      getWeakPracticeInsights(curriculum, WEAK_QUESTIONS_LIMIT)
    ]);

  if (identityResult.status === 'rejected') {
    throw identityResult.reason;
  }

  return {
    identity: identityResult.value,
    practiceState:
      practiceResult.status === 'fulfilled'
        ? practiceResult.value
        : createEmptyPracticeState(),
    questionsCount:
      catalogResult.status === 'fulfilled' ? catalogResult.value.totalQuestions : 0,
    weakQuestions:
      weakQuestionsResult.status === 'fulfilled' ? weakQuestionsResult.value : [],
    syncError:
      practiceResult.status === 'rejected'
        ? practiceResult.reason instanceof Error
          ? practiceResult.reason.message
          : 'No se ha podido sincronizar el progreso.'
        : null,
    questionsError:
      catalogResult.status === 'rejected'
        ? catalogResult.reason instanceof Error
          ? catalogResult.reason.message
          : 'No se ha podido cargar el catalogo de preguntas.'
        : null
  };
};

export const refreshPracticeAfterSession = async (
  curriculum = DEFAULT_CURRICULUM
) => {
  const [practiceState, weakQuestions] = await Promise.all([
    getMyPracticeState(curriculum),
    getWeakPracticeInsights(curriculum, WEAK_QUESTIONS_LIMIT)
  ]);

  return {
    practiceState,
    weakQuestions
  };
};
