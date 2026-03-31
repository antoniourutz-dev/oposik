import type { MainTab } from '../../components/BottomDock';
import type { PracticeQuestionScopeFilter } from '../../practiceTypes';

/**
 * Valores por defecto al entrar en modo invitado desde la pantalla de acceso (transición de flujo).
 * La preferencia persistida de ámbito vive en `usePracticeQuestionScope` / `practiceQuestionScopePreference`.
 * Centralizados aquí para evitar divergencias y facilitar comprobaciones en tests.
 */
export const GUEST_ENTRY_DEFAULT_TAB: MainTab = 'home';
export const GUEST_ENTRY_DEFAULT_SCOPE: PracticeQuestionScopeFilter = 'all';
