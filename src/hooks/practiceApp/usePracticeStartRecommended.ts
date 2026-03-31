import { useCallback } from 'react';
import type { PracticeCoachPlan, PracticeQuestionScopeFilter } from '../../practiceTypes';

type UsePracticeStartRecommendedParams = {
  coachPlan: PracticeCoachPlan;
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
  recommendedBatchStartIndex,
  selectedQuestionScope,
  startAntiTrap,
  startMixed,
  startRandom,
  startSimulacro,
  startStandardSession,
}: UsePracticeStartRecommendedParams) =>
  useCallback(() => {
    switch (coachPlan.mode) {
      case 'mixed':
        startMixed();
        return;
      case 'random':
        startRandom();
        return;
      case 'anti_trap':
        startAntiTrap();
        return;
      case 'simulacro':
        startSimulacro();
        return;
      default:
        void startStandardSession(recommendedBatchStartIndex, selectedQuestionScope);
    }
  }, [
    coachPlan.mode,
    recommendedBatchStartIndex,
    selectedQuestionScope,
    startAntiTrap,
    startMixed,
    startRandom,
    startSimulacro,
    startStandardSession,
  ]);
