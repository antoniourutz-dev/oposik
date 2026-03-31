import { describe, expect, it, vi } from 'vitest';
import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
  it('devuelve el resultado si la promesa resuelve a tiempo', async () => {
    await expect(withTimeout(Promise.resolve(42), 50)).resolves.toBe(42);
  });

  it('rechaza con el mensaje indicado si se agota el tiempo', async () => {
    vi.useFakeTimers();
    const p = withTimeout(new Promise(() => undefined), 1000, 'demasiado lento');
    const assert = expect(p).rejects.toThrow('demasiado lento');
    await vi.advanceTimersByTimeAsync(1000);
    await assert;
    vi.useRealTimers();
  });
});
