import type { ActivePracticeSession, PracticeQuestionScopeFilter, WeakQuestionInsight } from '../practiceTypes';
import {
  DEFAULT_CURRICULUM,
  PRACTICE_BATCH_SIZE,
  SIMULACRO_BATCH_SIZE
} from '../practiceConfig';
import {
  getAntiTrapPracticeBatch,
  getGuestPracticeBatch,
  getMixedPracticeBatch,
  getRandomPracticeBatch,
  getSimulacroPracticeBatch,
  getStandardPracticeBatch
} from '../services/preguntasApi';
import {
  buildAntiTrapPracticeSession,
  buildGuestPracticeSession,
  buildMixedPracticeSession,
  buildRandomPracticeSession,
  buildSimulacroPracticeSession,
  buildStandardPracticeSession,
  buildWeakestPracticeSession
} from '../services/practiceSessionFactory';
import { GUEST_MAX_BLOCKS } from './practiceAppStorage';

export type SessionStarterCommandResult = {
  session: ActivePracticeSession | null;
  nextGuestBlockNumber?: number;
};

export const loadStandardSessionCommand = async ({
  batchStartIndex,
  questionsCount,
  questionScope
}: {
  batchStartIndex: number;
  questionsCount: number;
  questionScope: PracticeQuestionScopeFilter;
}): Promise<SessionStarterCommandResult> => {
  const normalizedStartIndex =
    batchStartIndex >= 0 && batchStartIndex < questionsCount ? batchStartIndex : 0;
  const batchQuestions = await getStandardPracticeBatch(
    normalizedStartIndex,
    PRACTICE_BATCH_SIZE,
    DEFAULT_CURRICULUM,
    questionScope
  );

  return {
    session: buildStandardPracticeSession({
      batchStartIndex: normalizedStartIndex,
      questionsCount,
      questions: batchQuestions,
      questionScope,
      batchSize: PRACTICE_BATCH_SIZE
    })
  };
};

export const loadRandomSessionCommand = async ({
  questionScope
}: {
  questionScope: PracticeQuestionScopeFilter;
}): Promise<SessionStarterCommandResult> => {
  const randomQuestions = await getRandomPracticeBatch(
    PRACTICE_BATCH_SIZE,
    DEFAULT_CURRICULUM,
    questionScope
  );

  return {
    session: buildRandomPracticeSession(randomQuestions, questionScope)
  };
};

export const loadGuestSessionCommand = async ({
  guestBlocksUsed
}: {
  guestBlocksUsed: number;
}): Promise<SessionStarterCommandResult> => {
  const nextBlockNumber = guestBlocksUsed + 1;
  const guestQuestions = await getGuestPracticeBatch(
    PRACTICE_BATCH_SIZE,
    DEFAULT_CURRICULUM
  );

  return {
    session: buildGuestPracticeSession({
      questions: guestQuestions,
      blockNumber: nextBlockNumber,
      totalBlocks: GUEST_MAX_BLOCKS
    }),
    nextGuestBlockNumber: nextBlockNumber
  };
};

export const loadMixedSessionCommand = async ({
  questionScope,
  recommendedBatchStartIndex,
  questionsCount
}: {
  questionScope: PracticeQuestionScopeFilter;
  recommendedBatchStartIndex: number;
  questionsCount: number;
}): Promise<SessionStarterCommandResult> => {
  try {
    const mixedQuestions = await getMixedPracticeBatch(
      PRACTICE_BATCH_SIZE,
      DEFAULT_CURRICULUM,
      questionScope
    );

    return {
      session: buildMixedPracticeSession(mixedQuestions, questionScope)
    };
  } catch (error) {
    const fallback = await loadStandardSessionCommand({
      batchStartIndex: recommendedBatchStartIndex,
      questionsCount,
      questionScope
    }).catch(() => null);

    if (fallback?.session) {
      return fallback;
    }

    throw error;
  }
};

export const loadAntiTrapSessionCommand = async ({
  questionScope,
  weakQuestions
}: {
  questionScope: PracticeQuestionScopeFilter;
  weakQuestions: WeakQuestionInsight[];
}): Promise<SessionStarterCommandResult> => {
  try {
    const antiTrapQuestions = await getAntiTrapPracticeBatch(
      PRACTICE_BATCH_SIZE,
      DEFAULT_CURRICULUM,
      questionScope
    );

    return {
      session: buildAntiTrapPracticeSession(antiTrapQuestions, questionScope)
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
  questionScope
}: {
  questionScope: PracticeQuestionScopeFilter;
}): Promise<SessionStarterCommandResult> => {
  try {
    const simulacroQuestions = await getSimulacroPracticeBatch(
      SIMULACRO_BATCH_SIZE,
      DEFAULT_CURRICULUM,
      questionScope
    );

    return {
      session: buildSimulacroPracticeSession(simulacroQuestions, questionScope)
    };
  } catch (error) {
    const fallbackQuestions = await getRandomPracticeBatch(
      SIMULACRO_BATCH_SIZE,
      DEFAULT_CURRICULUM,
      questionScope
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
