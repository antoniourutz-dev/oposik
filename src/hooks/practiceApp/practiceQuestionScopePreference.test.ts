import { describe, expect, it } from 'vitest';
import { applyQuestionScopeChange } from './practiceQuestionScopePreference';

describe('applyQuestionScopeChange', () => {
  it('devuelve el valor actual si coincide con el siguiente', () => {
    expect(applyQuestionScopeChange('all', 'all')).toBe('all');
    expect(applyQuestionScopeChange('common', 'common')).toBe('common');
  });

  it('sustituye cuando el siguiente valor es distinto', () => {
    expect(applyQuestionScopeChange('all', 'specific')).toBe('specific');
    expect(applyQuestionScopeChange('common', 'all')).toBe('all');
  });
});
