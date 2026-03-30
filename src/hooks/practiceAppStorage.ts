import type { PracticeQuestionScopeFilter } from '../practiceTypes';

export const GUEST_MAX_BLOCKS = 2;

const GUEST_ACCESS_STORAGE_KEY = 'quantia_guest_preview_v1';
const QUESTION_SCOPE_STORAGE_KEY = 'quantia_question_scope_v1';

const clampGuestBlocksUsed = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(GUEST_MAX_BLOCKS, Math.max(0, Math.trunc(numeric)));
};

export const readGuestBlocksUsed = () => {
  if (typeof window === 'undefined') return 0;

  try {
    const rawValue = window.localStorage.getItem(GUEST_ACCESS_STORAGE_KEY);
    if (!rawValue) return 0;

    const parsed = JSON.parse(rawValue) as number | { usedBlocks?: number };
    return clampGuestBlocksUsed(
      typeof parsed === 'number' ? parsed : parsed?.usedBlocks
    );
  } catch {
    return 0;
  }
};

export const persistGuestBlocksUsed = (usedBlocks: number) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    GUEST_ACCESS_STORAGE_KEY,
    JSON.stringify({
      usedBlocks: clampGuestBlocksUsed(usedBlocks),
      updatedAt: new Date().toISOString()
    })
  );
};

const isStoredQuestionScope = (value: unknown): value is PracticeQuestionScopeFilter =>
  value === 'all' || value === 'common' || value === 'specific';

export const readQuestionScope = (): PracticeQuestionScopeFilter => {
  if (typeof window === 'undefined') return 'all';

  try {
    const rawValue = window.localStorage.getItem(QUESTION_SCOPE_STORAGE_KEY);
    if (!rawValue) return 'all';

    const parsed = JSON.parse(rawValue) as string | { questionScope?: string };
    const candidate = typeof parsed === 'string' ? parsed : parsed?.questionScope;
    return isStoredQuestionScope(candidate) ? candidate : 'all';
  } catch {
    return 'all';
  }
};

export const persistQuestionScope = (questionScope: PracticeQuestionScopeFilter) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    QUESTION_SCOPE_STORAGE_KEY,
    JSON.stringify({
      questionScope,
      updatedAt: new Date().toISOString()
    })
  );
};
