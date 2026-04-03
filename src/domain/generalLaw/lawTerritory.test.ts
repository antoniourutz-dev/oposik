import { describe, expect, it } from 'vitest';
import {
  appendTerritoryToContinuityBridge,
  isBlockEligibleForTerritoryRecommendation,
  pickWeakestRecommendableBlock,
  resolveLawTerritoryContinuityHint,
} from './lawTerritory';
import type { PracticeLawBlockPerformance, PracticeLawPerformance } from '../../practiceTypes';

describe('lawTerritory', () => {
  it('exige masa mínima para recomendar bloque', () => {
    const small: PracticeLawBlockPerformance = {
      blockId: 'b1',
      title: 'A',
      questionCount: 3,
      attempts: 3,
      correctAttempts: 1,
      accuracyRate: 0.33,
    };
    const ok: PracticeLawBlockPerformance = {
      blockId: 'b2',
      title: 'B',
      questionCount: 10,
      attempts: 10,
      correctAttempts: 5,
      accuracyRate: 0.5,
    };
    expect(isBlockEligibleForTerritoryRecommendation(small)).toBe(false);
    expect(isBlockEligibleForTerritoryRecommendation(ok)).toBe(true);
  });

  it('elige el bloque peor entre elegibles por masa', () => {
    const blocks: PracticeLawBlockPerformance[] = [
      {
        blockId: 'a',
        title: 'A',
        trainingFocus: 'Plazos',
        questionCount: 10,
        attempts: 10,
        correctAttempts: 8,
        accuracyRate: 0.8,
      },
      {
        blockId: 'b',
        title: 'B',
        trainingFocus: 'Notificacion',
        questionCount: 10,
        attempts: 10,
        correctAttempts: 3,
        accuracyRate: 0.3,
      },
    ];
    expect(pickWeakestRecommendableBlock(blocks)?.blockId).toBe('b');
  });

  it('resuelve continuidad con intención de ley y microfoco del bloque más débil', () => {
    const laws: PracticeLawPerformance[] = [
      {
        ley_referencia: 'Ley 39/2015',
        trainingIntent: 'Dominar actos y plazos',
        attempts: 20,
        questionCount: 40,
        consolidatedCount: 10,
        correctAttempts: 12,
        accuracyRate: 0.6,
        blocks: [
          {
            blockId: 'x',
            title: 'Actos',
            trainingFocus: 'Requisitos de validez',
            questionCount: 12,
            attempts: 12,
            correctAttempts: 4,
            accuracyRate: 0.33,
          },
          {
            blockId: 'y',
            title: 'Vacío',
            trainingFocus: 'No usar',
            questionCount: 2,
            attempts: 2,
            correctAttempts: 0,
            accuracyRate: 0,
          },
        ],
      },
    ];
    const hint = resolveLawTerritoryContinuityHint('Ley 39/2015', laws);
    expect(hint?.lawTrainingIntent).toContain('Dominar');
    expect(hint?.blockTrainingFocus).toContain('Requisitos');
  });

  it('fusiona territorio en línea de continuidad', () => {
    const merged = appendTerritoryToContinuityBridge('Linea base.', {
      lawTrainingIntent: 'Foco A',
      blockTrainingFocus: 'Foco B',
    });
    expect(merged).toContain('Linea base.');
    expect(merged).toContain('Foco A');
    expect(merged).toContain('Foco B');
  });
});
