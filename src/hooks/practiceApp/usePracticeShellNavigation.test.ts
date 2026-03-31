import { describe, expect, it } from 'vitest';
import type { MainTab } from '../../components/BottomDock';
import { guardGenericPlayerActiveTab } from './usePracticeShellNavigation';

describe('usePracticeShellNavigation', () => {
  it('guardGenericPlayerActiveTab fuerza home si el tab es stats', () => {
    const isGenericPlayer = true;
    const statsTab: MainTab = 'stats';
    expect(guardGenericPlayerActiveTab(isGenericPlayer, statsTab)).toBe('home');
  });

  it('guardGenericPlayerActiveTab no altera tabs cuando no es jugador genérico', () => {
    const isGenericPlayer = false;
    expect(guardGenericPlayerActiveTab(isGenericPlayer, 'home')).toBe('home');
    expect(guardGenericPlayerActiveTab(isGenericPlayer, 'stats')).toBe('stats');
  });
});

