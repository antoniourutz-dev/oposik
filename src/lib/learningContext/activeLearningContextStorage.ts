import {
  buildStoredGeneralLawLearningContext,
  GENERAL_LAW_CONTEXT_ID,
} from '../../domain/learningContext/catalog';
import type { ActiveLearningContext } from '../../domain/learningContext/types';

type StoredLearningContextSelection = {
  contextId: string;
  contextType: 'general_law';
};

const storageKey = (userId: string) => `oposik.active-learning-context.v1:${userId}`;

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const readStoredLearningContextSelection = (
  userId: string | null,
): ActiveLearningContext | null => {
  if (!userId || !canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLearningContextSelection | null;
    if (!parsed || parsed.contextType !== 'general_law') return null;
    if (parsed.contextId !== GENERAL_LAW_CONTEXT_ID) return null;
    return buildStoredGeneralLawLearningContext();
  } catch {
    return null;
  }
};

export const writeStoredLearningContextSelection = (
  userId: string,
  context: ActiveLearningContext,
) => {
  if (!canUseStorage()) return;
  const payload: StoredLearningContextSelection = {
    contextId: context.contextId,
    contextType: 'general_law',
  };
  window.localStorage.setItem(storageKey(userId), JSON.stringify(payload));
};

export const clearStoredLearningContextSelection = (userId: string | null) => {
  if (!userId || !canUseStorage()) return;
  window.localStorage.removeItem(storageKey(userId));
};
