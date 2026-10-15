import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { normalizePhone } from '../../utils/phone.util';

describe('normalizePhone', () => {
  it.each([
    ['+94 77-123-4567', '94771234567'],
    ['(94) 77.123.4567', '94771234567'],
    ['94771234567', '94771234567'],
  ])('strips formatting from %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    ['0752697878', '94752697878'],
    ['075 269 7878', '94752697878'],
  ])('converts local number %s to international format', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([['12345678'], ['123456789012345']])(
    'accepts the boundary length %s',
    (input) => {
      expect(normalizePhone(input)).toBe(input);
    },
  );

  it.each([
    ['letters', 'abc'],
    ['empty string', ''],
    ['too short', '1234567'],
    ['too long', '1234567890123456'],
    ['letters mixed with digits', '9477abc4567'],
  ])('rejects %s', (_label, input) => {
    expect(() => normalizePhone(input)).toThrow(BadRequestException);
    expect(() => normalizePhone(input)).toThrow(
      'Recipient phone number must be in international format',
    );
  });
});
