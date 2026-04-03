import { useCallback } from 'react';
import type { PracticeCoachPlan, PracticeQuestionScopeFilter } from '../../practiceTypes';
import type { ActiveLearningContext } from '../../domain/learningContext/types';

type UsePracticeStartRecommendedParams = {
  coachPlan: PracticeCoachPlan;
  activeLearningContext?: ActiveLearningContext | null;
  recommendedBatchStartIndex: number;
  selectedQuestionScope: PracticeQuestionScopeFilter;
  startAntiTrap: () => void;
  startMixed: () => void;
  startRandom: () => void;
  startSimulacro: () => void;
  startStandardSession: (
    batchStartIndex: number,
    questionScope: PracticeQuestionScopeFilter,
  ) => void | Promise<void>;
};

/**
 * Despacha el inicio según el modo del coach (misma lógica que el objeto retorno anterior).
 * Referencia estable vía useCallback para consumidores que la pasan como prop.
 */
export const usePracticeStartRecommended = ({
  coachPlan,
  activeLearningContext,
  recommendedBatchStartIndex,
  selectedQuestionScope,
  startAntiTrap,
  startMixed,
  startRandom,
  startSimulacro,
  startStandardSession,
}: UsePracticeStartRecommendedParams) =>
  useCallback(() => {
    const supportsExamMode = activeLearningContext?.config.capabilities.supportsExamMode ?? true;
    const supportsPressureTraining =
      activeLearningContext?.config.capabilities.supportsPressureTraining ?? true;

    switch (coachPlan.mode) {
      case 'mixed':
        startMixed();
        return;
      case 'random':
        startRandom();
        return;
      case 'anti_trap':
        if (!supportsPressureTraining) {
          void startStandardSession(recommendedBatchStartIndex, selectedQuestionScope);
          return;
        }
        startAntiTrap();
        return;
      case 'simulacro':
        if (!supportsExamMode) {
          void startStandardSession(recommendedBatchStartIndex, selectedQuestionScope);
          return;
        }
        startSimulacro();
        return;
      default:
        void startStandardSession(recommendedBatchStartIndex, selectedQuestionScope);
    }
  }, [
    activeLearningContext?.config.capabilities.supportsExamMode,
    activeLearningContext?.config.capabilities.supportsPressureTraining,
    coachPlan.mode,
    recommendedBatchStartIndex,
    selectedQuestionScope,
    startAntiTrap,
    startMixed,
    startRandom,
    startSimulacro,
    startStandardSession,
  ]);
