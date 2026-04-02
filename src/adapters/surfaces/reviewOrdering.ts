import type { ErrorType, PracticeCategoryRiskSummary, PracticeMode } from '../../practiceTypes';
import type { SurfaceDominantState } from './surfaceTypes';

export type ReviewOrderingEntry<TAnswer> = {
  answer: TAnswer;
  reviewIndex: number;
};

export type ReviewOrderingFilterPriority =
  | 'mistakes_first'
  | 'pressure_mistakes'
  | 'weak_only'
  | 'mixed';

type ReviewOrderingSignals = {
  isCorrect: boolean;
  errorTypeInferred: ErrorType | null;
  questionCategory: string | null;
};

const stableSortBy = <T,>(
  items: readonly T[],
  score: (item: T) => number,
): T[] => {
  const decorated = items.map((item, idx) => ({ item, idx, s: score(item) }));
  decorated.sort((a, b) => (b.s - a.s) || (a.idx - b.idx));
  return decorated.map((d) => d.item);
};

const buildWeakCategorySet = (weakCategories?: PracticeCategoryRiskSummary[] | null) => {
  const set = new Set<string>();
  (weakCategories ?? []).forEach((c) => {
    if (c?.category) set.add(String(c.category).toLowerCase());
  });
  return set;
};

export function orderReviewEntries<TAnswer extends ReviewOrderingSignals>(
  input: {
    items: readonly ReviewOrderingEntry<TAnswer>[];
    filterPriority: ReviewOrderingFilterPriority;
    dominantState: SurfaceDominantState;
    sessionMode?: PracticeMode;
    repeatedErrorTypes?: ReadonlySet<ErrorType>;
    weakCategories?: PracticeCategoryRiskSummary[] | null;
  },
): ReviewOrderingEntry<TAnswer>[] {
  const {
    items,
    filterPriority,
    dominantState,
    sessionMode,
    repeatedErrorTypes,
    weakCategories,
  } = input;

  if (filterPriority === 'mixed') return [...items];

  const weakSet = buildWeakCategorySet(weakCategories);
  const hasWeakSignal = weakSet.size > 0;

  const effectivePriority: ReviewOrderingFilterPriority =
    filterPriority === 'weak_only' && !hasWeakSignal ? 'mistakes_first' : filterPriority;

  const isPressureSurface = sessionMode === 'simulacro' || dominantState === 'pressure';

  return stableSortBy(items, (entry) => {
    const a = entry.answer;
    const incorrect = a.isCorrect ? 0 : 1;
    const repeated = !a.isCorrect && a.errorTypeInferred && repeatedErrorTypes?.has(a.errorTypeInferred) ? 1 : 0;
    const reading = !a.isCorrect && a.errorTypeInferred === 'lectura_rapida' ? 1 : 0;
    const weak =
      !a.isCorrect &&
      a.questionCategory &&
      weakSet.has(String(a.questionCategory).toLowerCase())
        ? 1
        : 0;

    // Score grande = más arriba. Mínimo riesgo: pesos simples, orden estable.
    switch (effectivePriority) {
      case 'pressure_mistakes': {
        const pressure = isPressureSurface && !a.isCorrect ? 1 : 0;
        return incorrect * 100 + pressure * 30 + repeated * 20 + reading * 10 + weak * 8;
      }
      case 'weak_only': {
        // Si hay señal, prioriza lo débil. Si no, ya degradó a mistakes_first.
        return incorrect * 100 + weak * 40 + repeated * 20 + reading * 10;
      }
      case 'mistakes_first':
      default:
        return incorrect * 100 + repeated * 25 + reading * 12 + weak * 8;
    }
  });
}

