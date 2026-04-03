export type HighlightCategory =
  | 'legal_reference'
  | 'core_concept'
  | 'negation'
  | 'condition'
  | 'deadline'
  | 'subject'
  | 'differentiator';

export const HIGHLIGHT_CATEGORIES: HighlightCategory[] = [
  'legal_reference',
  'core_concept',
  'negation',
  'condition',
  'deadline',
  'subject',
  'differentiator',
];

export type HighlightSpan = {
  start: number;
  end: number;
  category: HighlightCategory;
  score: number;
  colorToken?: HighlightCategory;
  note?: string;
};

export type HighlightBlockType = 'question' | 'answer' | 'explanation';
export type HighlightOverrideMode = 'manual' | 'disabled';

export type HighlightOverrideRecord = {
  id: string;
  questionId: number;
  contentType: HighlightBlockType;
  answerIndex: number | null;
  mode: HighlightOverrideMode;
  spans: HighlightSpan[];
  version: number;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type HighlightSource = 'manual' | 'disabled' | 'auto' | 'none';
