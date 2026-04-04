import type { PracticeConfidenceFlag, PracticeMode } from '../practiceTypes';

export const mapExternalPracticeMode = (value: unknown): PracticeMode => {
  const normalized = String(value ?? '').trim();

  switch (normalized) {
    case 'weakest':
    case 'quick_five':
    case 'random':
    case 'review':
    case 'mixed':
    case 'simulacro':
    case 'anti_trap':
    case 'catalog_review':
      return normalized as PracticeMode;
    default:
      return 'standard';
  }
};

export const mapExternalPracticeConfidenceFlag = (value: unknown): PracticeConfidenceFlag => {
  switch (String(value ?? '').trim()) {
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    default:
      return 'low';
  }
};
