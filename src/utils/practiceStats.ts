import {
  PracticeQuestion,
  PracticeQuestionStat,
  WeakQuestionInsight
} from '../practiceTypes';

export const getAccuracy = (correct: number, total: number) =>
  total === 0 ? 0 : Math.round((correct / total) * 100);

export const getTopWeakQuestions = (
  questionStats: PracticeQuestionStat[],
  questions: PracticeQuestion[],
  limit = 5
) => {
  if (!questionStats.length) return [] as WeakQuestionInsight[];

  const questionsById = new Map(questions.map((question) => [question.id, question]));

  return questionStats
    .filter((stat) => stat.incorrectAttempts > 0)
    .sort((a, b) => {
      if (b.incorrectAttempts !== a.incorrectAttempts) {
        return b.incorrectAttempts - a.incorrectAttempts;
      }

      const aRate = a.incorrectAttempts / Math.max(a.attempts, 1);
      const bRate = b.incorrectAttempts / Math.max(b.attempts, 1);
      if (bRate !== aRate) {
        return bRate - aRate;
      }

      return (b.lastIncorrectAt ?? '').localeCompare(a.lastIncorrectAt ?? '');
    })
    .map((stat) => {
      const question = questionsById.get(stat.questionId);
      if (!question) return null;
      return { question, stat };
    })
    .filter((item): item is WeakQuestionInsight => Boolean(item))
    .slice(0, limit);
};

export const getWeakCategories = (questionStats: PracticeQuestionStat[]) => {
  if (!questionStats.length) return [] as Array<{ category: string; incorrectAttempts: number; attempts: number }>;

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
