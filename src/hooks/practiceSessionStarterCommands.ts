import type {
  ActivePracticeSession,
  PracticeQuestionScope,
  PracticeQuestionScopeFilter,
  WeakQuestionInsight,
} from '../practiceTypes';
import {
  DEFAULT_CURRICULUM,
  PRACTICE_BATCH_SIZE,
  QUICK_FIVE_BATCH_SIZE,
  SIMULACRO_BATCH_SIZE,
} from '../practiceConfig';
import {
  getAntiTrapPracticeBatch,
  getFullCatalogQuestionsForScope,
  getGuestPracticeBatch,
  getLawPracticeBatch,
  getMixedPracticeBatch,
  getRandomPracticeBatch,
  getSimulacroPracticeBatch,
  getStandardPracticeBatch,
  getTopicPracticeBatch,
  getWeakPracticeInsights,
} from '../services/preguntasApi';
import {
  buildAntiTrapPracticeSession,
  buildCatalogReviewSession,
  buildGuestPracticeSession,
  buildLawPracticeSession,
  buildMixedPracticeSession,
  buildQuickFivePracticeSession,
  buildRandomPracticeSession,
  buildSimulacroPracticeSession,
  buildStandardPracticeSession,
  buildTopicPracticeSession,
  buildWeakestPracticeSession,
} from '../services/practiceSessionFactory';
import { GUEST_MAX_BLOCKS } from './practiceAppStorage';

export type SessionStarterCommandResult = {
  session: ActivePracticeSession | null;
  nextGuestBlockNumber?: number;
};

export const loadStandardSessionCommand = async ({
  batchStartIndex,
  questionsCount,
  questionScope,
  curriculum = DEFAULT_CURRICULUM,
}: {
  batchStartIndex: number;
  questionsCount: number;
  questionScope: PracticeQuestionScopeFilter;
  curriculum?: string;
}): Promise<SessionStarterCommandResult> => {
  const normalizedStartIndex =
    batchStartIndex >= 0 && batchStartIndex < questionsCount ? batchStartIndex : 0;
  const batchQuestions = await getStandardPracticeBatch(
    normalizedStartIndex,
    PRACTICE_BATCH_SIZE,
    curriculum,
    questionScope,
  );

  return {
    session: buildStandardPracticeSession({
      batchStartIndex: normalizedStartIndex,
      questionsCount,
      questions: batchQuestions,
      questionScope,
      batchSize: PRACTICE_BATCH_SIZE,
    }),
  };
};

export const loadRandomSessionCommand = async ({
  questionScope,
  curriculum = DEFAULT_CURRICULUM,
}: {
  questionScope: PracticeQuestionScopeFilter;
  curriculum?: string;
}): Promise<SessionStarterCommandResult> => {
  const randomQuestions = await getRandomPracticeBatch(
    PRACTICE_BATCH_SIZE,
    curriculum,
    questionScope,
  );

  return {
    session: buildRandomPracticeSession(randomQuestions, questionScope),
  };
};

export const loadQuickFiveSessionCommand = async ({
  questionScope,
  curriculum = DEFAULT_CURRICULUM,
}: {
  questionScope: PracticeQuestionScopeFilter;
  curriculum?: string;
}): Promise<SessionStarterCommandResult> => {
  const quickQuestions = await getRandomPracticeBatch(
    QUICK_FIVE_BATCH_SIZE,
    curriculum,
    questionScope,
  );

  return {
    session: buildQuickFivePracticeSession(quickQuestions, questionScope),
  };
};

/**
 * Repaso de falladas: siempre pide el batch débil al servidor tras sincronizar (user_question_state).
 * El snapshot de React Query suele ir atrasado; si primero usábamos weakQuestions locales, repetías
 * siempre las mismas preguntas aunque hubieras acertado.
 */
export const loadWeakReviewSessionCommand = async ({
  questionScope,
  weakQuestions,
  recommendedBatchStartIndex,
  questionsCount,
  curriculum = DEFAULT_CURRICULUM,
}: {
  questionScope: PracticeQuestionScopeFilter;
  weakQuestions: WeakQuestionInsight[];
  recommendedBatchStartIndex: number;
  questionsCount: number;
  curriculum?: string;
}): Promise<SessionStarterCommandResult> => {
  const fresh = await getWeakPracticeInsights(
    curriculum,
    PRACTICE_BATCH_SIZE,
    questionScope,
  );
  let session = buildWeakestPracticeSession(fresh, questionScope);
  if (session) {
    return { session };
  }

  session = buildWeakestPracticeSession(weakQuestions, questionScope);
  if (session) {
    return { session };
  }

  return loadStandardSessionCommand({
    batchStartIndex: recommendedBatchStartIndex,
    questionsCount,
    questionScope,
    curriculum,
  });
};

export const loadGuestSessionCommand = async ({
  guestBlocksUsed,
  curriculum = DEFAULT_CURRICULUM,
}: {
  guestBlocksUsed: number;
  curriculum?: string;
}): Promise<SessionStarterCommandResult> => {
  const nextBlockNumber = guestBlocksUsed + 1;
  const guestQuestions = await getGuestPracticeBatch(PRACTICE_BATCH_SIZE, curriculum);

  return {
    session: buildGuestPracticeSession({
      questions: guestQuestions,
      blockNumber: nextBlockNumber,
      totalBlocks: GUEST_MAX_BLOCKS,
    }),
    nextGuestBlockNumber: nextBlockNumber,
  };
};

export const loadMixedSessionCommand = async ({
  questionScope,
  recommendedBatchStartIndex,
  questionsCount,
  curriculum = DEFAULT_CURRICULUM,
}: {
  questionScope: PracticeQuestionScopeFilter;
  recommendedBatchStartIndex: number;
  questionsCount: number;
  curriculum?: string;
}): Promise<SessionStarterCommandResult> => {
  try {
    const mixedQuestions = await getMixedPracticeBatch(
      PRACTICE_BATCH_SIZE,
      curriculum,
      questionScope,
    );

    return {
      session: buildMixedPracticeSession(mixedQuestions, questionScope),
    };
  } catch (error) {
    const fallback = await loadStandardSessionCommand({
      batchStartIndex: recommendedBatchStartIndex,
      questionsCount,
      questionScope,
      curriculum,
    }).catch(() => null);

    if (fallback?.session) {
      return fallback;
    }

    throw error;
  }
};

export const loadAntiTrapSessionCommand = async ({
  questionScope,
  weakQuestions,
  curriculum = DEFAULT_CURRICULUM,
}: {
  questionScope: PracticeQuestionScopeFilter;
  weakQuestions: WeakQuestionInsight[];
  curriculum?: string;
}): Promise<SessionStarterCommandResult> => {
  try {
    const antiTrapQuestions = await getAntiTrapPracticeBatch(
      PRACTICE_BATCH_SIZE,
      curriculum,
      questionScope,
    );

    return {
      session: buildAntiTrapPracticeSession(antiTrapQuestions, questionScope),
    };
  } catch (error) {
    const fallback = buildWeakestPracticeSession(weakQuestions, questionScope);
    if (fallback) {
      return { session: fallback };
    }

    throw error;
  }
};

export const loadSimulacroSessionCommand = async ({
  questionScope,
  curriculum = DEFAULT_CURRICULUM,
}: {
  questionScope: PracticeQuestionScopeFilter;
  curriculum?: string;
}): Promise<SessionStarterCommandResult> => {
  try {
    const simulacroQuestions = await getSimulacroPracticeBatch(
      SIMULACRO_BATCH_SIZE,
      curriculum,
      questionScope,
    );

    return {
      session: buildSimulacroPracticeSession(simulacroQuestions, questionScope),
    };
  } catch (error) {
    const fallbackQuestions = await getRandomPracticeBatch(
      SIMULACRO_BATCH_SIZE,
      curriculum,
      questionScope,
    ).catch(() => null);

    const fallbackSession = fallbackQuestions
      ? buildSimulacroPracticeSession(fallbackQuestions, questionScope)
      : null;

    if (fallbackSession) {
      return { session: fallbackSession };
    }

    throw error;
  }
};

export const loadLawSessionCommand = async ({
  law,
  curriculum = DEFAULT_CURRICULUM,
}: {
  law: string;
  curriculum?: string;
}): Promise<SessionStarterCommandResult> => {
  const lawQuestions = await getLawPracticeBatch(law, PRACTICE_BATCH_SIZE, curriculum);

  return {
    session: buildLawPracticeSession(lawQuestions, law),
  };
};

export const loadTopicSessionCommand = async ({
  topic,
  curriculum = DEFAULT_CURRICULUM,
}: {
  topic: string;
  curriculum?: string;
}): Promise<SessionStarterCommandResult> => {
  const topicQuestions = await getTopicPracticeBatch(
    topic,
    PRACTICE_BATCH_SIZE,
    curriculum,
  );

  return {
    session: buildTopicPracticeSession(topicQuestions, topic),
  };
};

export const loadCatalogReviewSessionCommand = async ({
  scope,
  curriculum = DEFAULT_CURRICULUM,
}: {
  scope: PracticeQuestionScope;
  curriculum?: string;
}): Promise<SessionStarterCommandResult> => {
  const questions = await getFullCatalogQuestionsForScope(scope, curriculum);
  return {
    session: buildCatalogReviewSession({ questions, scope }),
  };
};
