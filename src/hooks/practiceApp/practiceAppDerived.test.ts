import { describe, expect, it } from 'vitest';
import {
  computeGuestBlocksRemaining,
  computeRecommendedBatchNumber,
  computeRecommendedBatchStartIndex,
  computeTopBarSubtitle,
  computeTotalBatches,
} from './practiceAppDerived';

describe('practiceAppDerived', () => {
  it('computeRecommendedBatchStartIndex respeta all + perfil y tope por questionsCount', () => {
    expect(
      computeRecommendedBatchStartIndex('all', { nextStandardBatchStartIndex: 40 }, 100),
    ).toBe(40);
    expect(
      computeRecommendedBatchStartIndex('all', { nextStandardBatchStartIndex: 200 }, 100),
    ).toBe(0);
    expect(computeRecommendedBatchStartIndex('specific', { nextStandardBatchStartIndex: 20 }, 100)).toBe(
      0,
    );
  });

  it('computeTotalBatches nunca es menor que 1', () => {
    expect(computeTotalBatches(0, 20)).toBe(1);
    expect(computeTotalBatches(21, 20)).toBe(2);
  });

  it('computeRecommendedBatchNumber', () => {
    expect(computeRecommendedBatchNumber(0, 20)).toBe(1);
    expect(computeRecommendedBatchNumber(40, 20)).toBe(3);
  });

  it('computeGuestBlocksRemaining', () => {
    expect(computeGuestBlocksRemaining(2, 5)).toBe(3);
    expect(computeGuestBlocksRemaining(10, 5)).toBe(0);
  });

  it('computeTopBarSubtitle', () => {
    expect(computeTopBarSubtitle('review', 'stats')).toBe('Revision');
    expect(computeTopBarSubtitle('home', 'home')).toBe('Inicio');
    expect(computeTopBarSubtitle('home', 'stats')).toBe('Estadisticas');
    expect(computeTopBarSubtitle('home', 'study')).toBe('Estudio');
    expect(computeTopBarSubtitle('home', 'profile')).toBe('Perfil');
  });
});
