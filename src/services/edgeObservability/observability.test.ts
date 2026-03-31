import { describe, expect, it } from 'vitest';
import {
  redactBearer,
  safeUserId,
  sanitizeError,
} from '../../../supabase/functions/_shared/observability';

describe('edge observability helpers', () => {
  it('redactBearer redacts bearer token', () => {
    expect(redactBearer('Bearer abc.def.ghi')).toBe('Bearer [REDACTED]');
    expect(redactBearer('bearer token')).toBe('Bearer [REDACTED]');
  });

  it('safeUserId shortens IDs', () => {
    expect(safeUserId(null)).toBe(null);
    expect(safeUserId('short')).toBe('short');
    expect(safeUserId('12345678901234567890')).toBe('123456…7890');
  });

  it('sanitizeError normalizes unknown errors', () => {
    expect(sanitizeError(new Error('boom'))).toMatchObject({ name: 'Error', message: 'boom' });
    expect(sanitizeError({ message: 'x' })).toMatchObject({ message: 'x' });
    expect(sanitizeError('oops')).toMatchObject({ message: 'oops' });
  });
});

