import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DeliveryStatus,
  NotificationChannel,
} from '../../schemas/notification-delivery.schema';

import {
  buildAlert,
  buildConfig,
  buildDelivery,
  buildRecipient,
} from '../test-builders-spec';

import { WhatsAppSender } from '../../channels/whatsapp.sender';

const CONFIGURED = {
  WHATSAPP_ACCESS_TOKEN: 'test-token',
  WHATSAPP_PHONE_NUMBER_ID: 'phone-id',
  WHATSAPP_API_VERSION: 'v20.0',
  WHATSAPP_TEMPLATE_NAME: 'hazard_alert',
};

const OPTED_IN_RECIPIENT = { phone: '+94 77-123-4567', whatsappOptIn: true };

function mockGraphApi(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
  });
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

describe('WhatsAppSender', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('serves the WhatsApp channel', () => {
    expect(new WhatsAppSender(buildConfig()).channel).toBe(
      NotificationChannel.WHATSAPP,
    );
  });

  describe('canReach', () => {
    const sender = new WhatsAppSender(buildConfig());

    it('is true for an opted-in recipient with a phone number', () => {
      expect(sender.canReach(buildRecipient(OPTED_IN_RECIPIENT))).toBe(true);
    });

    it.each([
      ['has not opted in', { phone: '0771234567', whatsappOptIn: false }],
      ['has no opt-in flag', { phone: '0771234567' }],
      ['opted in without a phone number', { whatsappOptIn: true }],
      ['opted in with an empty phone number', { phone: '', whatsappOptIn: true }],
    ])('is false for a recipient who %s', (_label, overrides) => {
      expect(sender.canReach(buildRecipient(overrides))).toBe(false);
    });
  });

  describe('send', () => {
    it('posts a template message and stores the provider message ID', async () => {
      const fetchMock = mockGraphApi({ messages: [{ id: 'provider-message-1' }] });
      const delivery = buildDelivery();

      await new WhatsAppSender(buildConfig(CONFIGURED)).send(
        buildAlert({
          affectedDistricts: ['Colombo', 'Gampaha'],
          affectedCities: ['Kelaniya'],
        }),
        buildRecipient(OPTED_IN_RECIPIENT),
        delivery,
      );

      const [url, init] = fetchMock.mock.calls[0];
      const payload = JSON.parse(init.body);
      expect(url).toBe('https://graph.facebook.com/v20.0/phone-id/messages');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      });
      expect(payload.to).toBe('94771234567');
      expect(payload.template.name).toBe('hazard_alert');
      expect(payload.template.language.code).toBe('en');
      expect(
        payload.template.components[0].parameters.map(
          (parameter: { text: string }) => parameter.text,
        ),
      ).toEqual([
        'Flood warning',
        'FLOOD',
        'WARNING',
        'Colombo, Gampaha',
        'Kelaniya',
        'Move to higher ground',
      ]);
      expect(delivery.status).toBe(DeliveryStatus.SENT);
      expect(delivery.sentAt).toBeInstanceOf(Date);
      expect(delivery.providerMessageId).toBe('provider-message-1');
      expect(delivery.save).toHaveBeenCalledOnce();
    });

    it('uses the configured template language', async () => {
      const fetchMock = mockGraphApi({ messages: [{ id: 'm' }] });

      await new WhatsAppSender(
        buildConfig({ ...CONFIGURED, WHATSAPP_TEMPLATE_LANGUAGE: 'si' }),
      ).send(buildAlert(), buildRecipient(OPTED_IN_RECIPIENT), buildDelivery());

      const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(payload.template.language.code).toBe('si');
    });

    it('marks the delivery SENT without a message ID when the provider returns none', async () => {
      mockGraphApi({});
      const delivery = buildDelivery();

      await new WhatsAppSender(buildConfig(CONFIGURED)).send(
        buildAlert(),
        buildRecipient(OPTED_IN_RECIPIENT),
        delivery,
      );

      expect(delivery.status).toBe(DeliveryStatus.SENT);
      expect(delivery.providerMessageId).toBeUndefined();
    });

    it.each([
      ['access token', 'WHATSAPP_ACCESS_TOKEN'],
      ['phone number ID', 'WHATSAPP_PHONE_NUMBER_ID'],
      ['API version', 'WHATSAPP_API_VERSION'],
      ['template name', 'WHATSAPP_TEMPLATE_NAME'],
    ])('records a configuration failure when the %s is missing', async (_label, missingKey) => {
      const fetchMock = mockGraphApi({});
      const delivery = buildDelivery();
      const values: Record<string, string> = { ...CONFIGURED };
      delete values[missingKey];

      await new WhatsAppSender(buildConfig(values)).send(
        buildAlert(),
        buildRecipient(OPTED_IN_RECIPIENT),
        delivery,
      );

      expect(fetchMock).not.toHaveBeenCalled();
      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe(
        'WhatsApp Cloud API configuration is incomplete',
      );
      expect(delivery.save).toHaveBeenCalledOnce();
      expect(warn).toHaveBeenCalledWith('WhatsApp delivery failed for alert alert-1');
    });

    it('records the provider error message when the API rejects the request', async () => {
      mockGraphApi(
        { error: { message: 'Provider unavailable' } },
        { ok: false, status: 503 },
      );
      const delivery = buildDelivery();

      await new WhatsAppSender(buildConfig(CONFIGURED)).send(
        buildAlert(),
        buildRecipient(OPTED_IN_RECIPIENT),
        delivery,
      );

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe('Provider unavailable');
      expect(delivery.sentAt).toBeUndefined();
      expect(delivery.save).toHaveBeenCalledOnce();
    });

    it('records the HTTP status when the API fails without an error message', async () => {
      mockGraphApi({}, { ok: false, status: 500 });
      const delivery = buildDelivery();

      await new WhatsAppSender(buildConfig(CONFIGURED)).send(
        buildAlert(),
        buildRecipient(OPTED_IN_RECIPIENT),
        delivery,
      );

      expect(delivery.failureReason).toBe('WhatsApp API returned HTTP 500');
    });

    it('records a network error without throwing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket hang up')));
      const delivery = buildDelivery();

      await expect(
        new WhatsAppSender(buildConfig(CONFIGURED)).send(
          buildAlert(),
          buildRecipient(OPTED_IN_RECIPIENT),
          delivery,
        ),
      ).resolves.toBeUndefined();

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe('socket hang up');
    });

    it('records an invalid phone number as a failed delivery', async () => {
      const fetchMock = mockGraphApi({});
      const delivery = buildDelivery();

      await new WhatsAppSender(buildConfig(CONFIGURED)).send(
        buildAlert(),
        buildRecipient({ phone: 'abc', whatsappOptIn: true }),
        delivery,
      );

      expect(fetchMock).not.toHaveBeenCalled();
      expect(delivery.failureReason).toBe(
        'Recipient phone number must be in international format',
      );
    });
  });
});
