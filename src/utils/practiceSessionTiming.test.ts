import { describe, expect, it } from 'vitest';
import {
  getSessionDurationSecondsForStats,
  getSessionDurationsSecondsForStats,
} from './practiceSessionTiming';

describe('practiceSessionTiming', () => {
  it('mantiene duraciones normales en sesiones estandar', () => {
    expect(
      getSessionDurationSecondsForStats({
        mode: 'standard',
        startedAt: '2026-04-04T10:00:00.000Z',
        finishedAt: '2026-04-04T10:18:00.000Z',
      }),
    ).toBe(18 * 60);
  });

  it('descarta como duracion valida una sesion que supera el tope', () => {
    expect(
      getSessionDurationSecondsForStats({
        mode: 'standard',
        startedAt: '2026-04-04T10:00:00.000Z',
        finishedAt: '2026-04-04T13:30:00.000Z',
      }),
    ).toBeNull();
  });

  it('sustituye sesiones infladas por la media de las validas', () => {
    expect(
      getSessionDurationsSecondsForStats([
        {
          mode: 'standard',
          startedAt: '2026-04-04T10:00:00.000Z',
          finishedAt: '2026-04-04T10:10:00.000Z',
        },
        {
          mode: 'standard',
          startedAt: '2026-04-04T11:00:00.000Z',
          finishedAt: '2026-04-04T14:30:00.000Z',
        },
        {
          mode: 'standard',
          startedAt: '2026-04-04T15:00:00.000Z',
          finishedAt: '2026-04-04T15:14:00.000Z',
        },
      ]),
    ).toEqual([10 * 60, 12 * 60, 14 * 60]);
  });

  it('usa una referencia prudente si no hay sesiones validas para promediar', () => {
    expect(
      getSessionDurationsSecondsForStats([
        {
          mode: 'quick_five',
          startedAt: '2026-04-04T10:00:00.000Z',
          finishedAt: '2026-04-04T11:00:00.000Z',
        },
      ]),
    ).toEqual([4 * 60]);
  });
});
