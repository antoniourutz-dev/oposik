import type { Dispatch, SetStateAction } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { MainTab } from '../../components/BottomDock';
import type { PracticeQuestionScopeFilter } from '../../practiceTypes';
import { GUEST_ENTRY_DEFAULT_SCOPE, GUEST_ENTRY_DEFAULT_TAB } from './practiceAuthTransitions';

export type PracticeShellTransitionDeps = {
  clearAccountContext: () => void;
  resetActiveSession: () => void;
  setActiveTab: Dispatch<SetStateAction<MainTab>>;
  setAuthReady: Dispatch<SetStateAction<boolean>>;
  setIsGuest: Dispatch<SetStateAction<boolean>>;
  setLoadingQuestions: Dispatch<SetStateAction<boolean>>;
  setQuestionsError: Dispatch<SetStateAction<string | null>>;
  setSelectedQuestionScope: Dispatch<SetStateAction<PracticeQuestionScopeFilter>>;
  setSession: Dispatch<SetStateAction<Session | null>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
};

/**
 * Transición: "login completado" disparado desde la UI.
 * Deja invitado y fuerza re-carga de datos.
 *
 * No poner `authReady` en false: Supabase suele emitir `SIGNED_IN` antes de que
 * termine `await loginWithUsername` + `onSignedIn()`, y ese listener ya deja
 * `authReady` en true. Si aquí lo volvemos a false, no hay un segundo `SIGNED_IN`
 * y la shell se queda en "Preparando acceso" hasta recargar.
 *
 * No poner `loadingQuestions` en true: la carga del banco la marca React Query
 * (`scopeQuery.isFetching`). Un `true` manual aquí no se limpia en ningún sitio
 * tras el login y deja el banner "Cargando catálogo" y CTAs bloqueados hasta recargar.
 */
export const applyUiSignedInTransition = (deps: Pick<
  PracticeShellTransitionDeps,
  'setIsGuest' | 'setAuthReady' | 'setLoadingQuestions'
>) => {
  deps.setIsGuest(false);
  deps.setAuthReady(true);
  deps.setLoadingQuestions(false);
};

/**
 * Transición: entrar en modo invitado (UI).
 * Coordina estado de auth/session, limpieza de datos, navegación y scope por defecto.
 */
export const applyUiEnterGuestTransition = (deps: PracticeShellTransitionDeps) => {
  deps.setSession(null);
  deps.clearAccountContext();
  deps.resetActiveSession();
  deps.setIsGuest(true);
  deps.setQuestionsError(null);
  deps.setSyncError(null);
  deps.setLoadingQuestions(false);
  deps.setActiveTab(GUEST_ENTRY_DEFAULT_TAB);
  deps.setSelectedQuestionScope(GUEST_ENTRY_DEFAULT_SCOPE);
};

/**
 * Transición: cierre de sesión cuando el usuario ya está en modo invitado (UI).
 * Mantiene la semántica previa: volver a "no invitado" y limpiar estados relacionados.
 */
export const applyUiSignOutFromGuestTransition = (deps: Pick<
  PracticeShellTransitionDeps,
  | 'setIsGuest'
  | 'setSession'
  | 'clearAccountContext'
  | 'resetActiveSession'
  | 'setLoadingQuestions'
  | 'setSyncError'
  | 'setQuestionsError'
  | 'setActiveTab'
>) => {
  deps.setIsGuest(false);
  deps.setSession(null);
  deps.clearAccountContext();
  deps.resetActiveSession();
  deps.setLoadingQuestions(false);
  deps.setSyncError(null);
  deps.setQuestionsError(null);
  deps.setActiveTab(GUEST_ENTRY_DEFAULT_TAB);
};

/**
 * Transición: evento de infraestructura Supabase SIGNED_OUT.
 * Mantiene la semántica previa del listener: reseteo coordinado + authReady true.
 */
export const applyAuthSignedOutTransition = (deps: Pick<
  PracticeShellTransitionDeps,
  | 'resetActiveSession'
  | 'setIsGuest'
  | 'clearAccountContext'
  | 'setSyncError'
  | 'setQuestionsError'
  | 'setLoadingQuestions'
  | 'setAuthReady'
>) => {
  deps.resetActiveSession();
  deps.setIsGuest(false);
  deps.clearAccountContext();
  deps.setSyncError(null);
  deps.setQuestionsError(null);
  deps.setLoadingQuestions(false);
  deps.setAuthReady(true);
};

/**
 * Transición: evento de infraestructura Supabase SIGNED_IN (con sesión).
 * Mantiene la semántica previa del listener: reseteo coordinado + authReady true.
 * (No tocar `loadingQuestions` aquí: un refresh de token puede disparar SIGNED_IN
 * mientras un starter sigue en curso y no debe cortar su indicador de carga.)
 */
export const applyAuthSignedInTransition = (deps: Pick<
  PracticeShellTransitionDeps,
  'resetActiveSession' | 'setIsGuest' | 'setQuestionsError' | 'setSyncError' | 'setAuthReady'
>) => {
  deps.resetActiveSession();
  deps.setIsGuest(false);
  deps.setQuestionsError(null);
  deps.setSyncError(null);
  deps.setAuthReady(true);
};

