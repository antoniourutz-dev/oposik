import type { MainTab } from '../../components/BottomDock';
import type { PracticeQuestionScopeFilter } from '../../practiceTypes';
import type { PracticeView } from '../usePracticeSessionFlow';

/** Perfil mínimo para calcular el índice de inicio del bloque recomendado (misma regla que antes en usePracticeApp). */
export type ProfileWithNextBatchIndex = {
  nextStandardBatchStartIndex: number;
};

/**
 * Índice del siguiente bloque estándar (offset en el catálogo ya filtrado por scope en el RPC).
 * Debe aplicarse también con temario **común / específico**: antes solo se usaba con `all`,
 * así que el offset se reseteaba a 0 y se repetían siempre las mismas 20 preguntas.
 */
export const computeRecommendedBatchStartIndex = (
  _selectedQuestionScope: PracticeQuestionScopeFilter,
  profile: ProfileWithNextBatchIndex | null | undefined,
  questionsCount: number,
): number => {
  if (!profile || questionsCount <= 0) return 0;
  const idx = profile.nextStandardBatchStartIndex;
  if (idx >= 0 && idx < questionsCount) {
    return idx;
  }
  return 0;
};

export const computeTotalBatches = (questionsCount: number, batchSize: number): number =>
  Math.max(1, Math.ceil(questionsCount / batchSize));

export const computeRecommendedBatchNumber = (
  recommendedBatchStartIndex: number,
  batchSize: number,
): number => Math.floor(recommendedBatchStartIndex / batchSize) + 1;

export const computeGuestBlocksRemaining = (guestBlocksUsed: number, guestMaxBlocks: number): number =>
  Math.max(0, guestMaxBlocks - guestBlocksUsed);

export const computeTopBarSubtitle = (view: PracticeView, activeTab: MainTab): string => {
  if (view === 'catalog_review') {
    return 'Análisis';
  }
  if (view === 'review') {
    return 'Revision';
  }
  if (activeTab === 'home') {
    return 'Inicio';
  }
  if (activeTab === 'stats') {
    return 'Estadisticas';
  }
  if (activeTab === 'study') {
    return 'Estudio';
  }
  return 'Perfil';
};
