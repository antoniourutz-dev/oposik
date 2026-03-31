import { PracticeQuestionStat } from '../practiceTypes';

export const getAccuracy = (correct: number, total: number) =>
  total === 0 ? 0 : Math.round((correct / total) * 100);

export const getWeakCategories = (questionStats: PracticeQuestionStat[]) => {
  if (!questionStats.length)
    return [] as Array<{ category: string; incorrectAttempts: number; attempts: number }>;

  const grouped = new Map<string, { incorrectAttempts: number; attempts: number }>();

  questionStats.forEach((stat: PracticeQuestionStat) => {
    const category = stat.category || 'Sin grupo';
    const current = grouped.get(category) ?? { incorrectAttempts: 0, attempts: 0 };
    current.incorrectAttempts += stat.incorrectAttempts;
    current.attempts += stat.attempts;
    grouped.set(category, current);
  });

  return [...grouped.entries()]
    .map(([category, values]) => ({ category, ...values }))
    .sort((a, b) => {
      if (b.incorrectAttempts !== a.incorrectAttempts) {
        return b.incorrectAttempts - a.incorrectAttempts;
      }
      return b.attempts - a.attempts;
    })
    .slice(0, 3);
};
