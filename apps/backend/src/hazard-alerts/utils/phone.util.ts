import { BadRequestException } from '@nestjs/common';

const FORMATTING_CHARACTERS = /[\s()+.-]/g;
const LOCAL_SRI_LANKAN_NUMBER = /^0\d{9}$/;
const INTERNATIONAL_DIGITS = /^\d{8,15}$/;
const SRI_LANKA_COUNTRY_CODE = '94';

/**
 * Converts a phone number into the format expected by SMS and WhatsApp
 * providers: international format, digits only, without a leading "+".
 * Local Sri Lankan numbers (07XXXXXXXX) become 947XXXXXXXX.
 *
 * @param phone Phone number as entered by the user, possibly formatted.
 * @returns The normalised digits-only number.
 * @throws BadRequestException when the result is not 8-15 digits.
 */
export function normalizePhone(phone: string): string {
  let normalized = phone.replace(FORMATTING_CHARACTERS, '');

  if (LOCAL_SRI_LANKAN_NUMBER.test(normalized)) {
    normalized = `${SRI_LANKA_COUNTRY_CODE}${normalized.slice(1)}`;
  }

  if (!INTERNATIONAL_DIGITS.test(normalized)) {
    throw new BadRequestException(
      'Recipient phone number must be in international format',
    );
  }

  return normalized;
}
