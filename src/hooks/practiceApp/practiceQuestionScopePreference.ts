import type { PracticeQuestionScopeFilter } from '../../practiceTypes';

/**
 * Preferencia de ámbito persistida en cliente (`practiceAppStorage`): `all` | `common` | `specific`.
 * La transición a invitado fuerza un valor por defecto de producto (`GUEST_ENTRY_DEFAULT_SCOPE` en
 * `practiceAuthTransitions`), no la última preferencia leída del almacenamiento.
 */

/**
 * Misma regla que el setter funcional de `handleQuestionScopeChange`: evita actualizar el estado
 * si el valor solicitado es idéntico al actual (referencia estable del string).
 */
export const applyQuestionScopeChange = (
  current: PracticeQuestionScopeFilter,
  next: PracticeQuestionScopeFilter,
): PracticeQuestionScopeFilter => (current === next ? current : next);
