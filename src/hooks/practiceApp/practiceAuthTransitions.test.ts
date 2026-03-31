import { describe, expect, it } from 'vitest';
import { GUEST_ENTRY_DEFAULT_SCOPE, GUEST_ENTRY_DEFAULT_TAB } from './practiceAuthTransitions';

describe('practiceAuthTransitions', () => {
  it('fija tab y ámbito por defecto al entrar como invitado', () => {
    expect(GUEST_ENTRY_DEFAULT_TAB).toBe('home');
    expect(GUEST_ENTRY_DEFAULT_SCOPE).toBe('all');
  });
});
