import { useCallback, useEffect, useState } from 'react';
import type { PracticeQuestionScopeFilter } from '../../practiceTypes';
import { persistQuestionScope, readQuestionScope } from '../practiceAppStorage';
import { applyQuestionScopeChange } from './practiceQuestionScopePreference';

/**
 * Capa de preferencia de ámbito de preguntas en el shell de práctica:
 * - **Restauración**: valor inicial desde `readQuestionScope()` (localStorage).
 * - **Persistencia**: cada cambio de `selectedQuestionScope` se guarda con `persistQuestionScope`.
 * - **UI**: `handleQuestionScopeChange` aplica deduplicación vía `applyQuestionScopeChange`.
 * - **Transiciones de flujo** (invitado, etc.): usan `setSelectedQuestionScope` expuesto; ver `usePracticeAuthActions`.
 */
export const usePracticeQuestionScope = () => {
  const [selectedQuestionScope, setSelectedQuestionScope] =
    useState<PracticeQuestionScopeFilter>(readQuestionScope);

  useEffect(() => {
    persistQuestionScope(selectedQuestionScope);
  }, [selectedQuestionScope]);

  const handleQuestionScopeChange = useCallback((questionScope: PracticeQuestionScopeFilter) => {
    setSelectedQuestionScope((currentScope) =>
      applyQuestionScopeChange(currentScope, questionScope),
    );
  }, []);

  return {
    handleQuestionScopeChange,
    selectedQuestionScope,
    setSelectedQuestionScope,
  };
};
