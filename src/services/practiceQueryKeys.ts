import type { PracticeQuestionScopeFilter } from '../practiceTypes';

export const practiceQueryKeys = {
  root: ['practice'] as const,
  userRoot: (userId: string, curriculum: string) =>
    ['practice', 'user', userId, curriculum] as const,
  account: (userId: string, curriculum: string) =>
    ['practice', 'user', userId, curriculum, 'account'] as const,
  scopeRoot: (userId: string, curriculum: string) =>
    ['practice', 'user', userId, curriculum, 'scope'] as const,
  scope: (userId: string, curriculum: string, questionScope: PracticeQuestionScopeFilter) =>
    ['practice', 'user', userId, curriculum, 'scope', questionScope] as const,
};
