import { describe, expect, it } from 'vitest';

import { isDuplicateKeyError, safeError } from '../../utils/error.util';

describe('safeError', () => {
  it('returns the message of an Error', () => {
    expect(safeError(new Error('Provider unavailable'))).toBe(
      'Provider unavailable',
    );
  });

  it('truncates long messages to 500 characters', () => {
    const result = safeError(new Error('x'.repeat(800)));

    expect(result).toHaveLength(500);
  });

  it('does not leak anything but the message of an Error', () => {
    const error = Object.assign(new Error('Request failed'), {
      headers: { Authorization: 'secret-token' },
    });

    expect(safeError(error)).toBe('Request failed');
  });

  it.each([
    ['a string', 'secret-token'],
    ['an object', { token: 'secret-token' }],
    ['null', null],
    ['undefined', undefined],
  ])('uses a generic message when %s is thrown', (_label, thrown) => {
    expect(safeError(thrown)).toBe('Unknown provider error');
  });
});

describe('isDuplicateKeyError', () => {
  it('recognises a MongoDB duplicate key error', () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
  });

  it.each([
    ['another error code', { code: 121 }],
    ['an error without a code', new Error('boom')],
    ['a string', '11000'],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_label, thrown) => {
    expect(isDuplicateKeyError(thrown)).toBe(false);
  });
});
