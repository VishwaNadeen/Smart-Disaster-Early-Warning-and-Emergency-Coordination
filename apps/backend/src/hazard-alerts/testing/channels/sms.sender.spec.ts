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

import { SmsSender } from '../../channels/sms.sender';

const CONFIGURED = {
  NOTIFYLK_USER_ID: '1001',
  NOTIFYLK_API_KEY: 'key',
};

function mockGateway(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
  });
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

function sentForm(fetchMock: ReturnType<typeof vi.fn>): URLSearchParams {
  return fetchMock.mock.calls[0][1].body as URLSearchParams;
}

describe('SmsSender', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('serves the SMS channel', () => {
    expect(new SmsSender(buildConfig()).channel).toBe(NotificationChannel.SMS);
  });

  describe('canReach', () => {
    const sender = new SmsSender(buildConfig());

    it('is true for a recipient with a phone number', () => {
      expect(sender.canReach(buildRecipient({ phone: '0752697878' }))).toBe(true);
    });

    it.each([
      ['no phone', {}],
      ['an empty phone', { phone: '' }],
    ])('is false for a recipient with %s', (_label, overrides) => {
      expect(sender.canReach(buildRecipient(overrides))).toBe(false);
    });
  });

  describe('send', () => {
    it('posts the alert to Notify.lk with an international number and marks the delivery SENT', async () => {
      const fetchMock = mockGateway({ status: 'success', data: 'Sent' });
      const delivery = buildDelivery();

      await new SmsSender(buildConfig(CONFIGURED)).send(
        buildAlert({ affectedDistricts: ['Kandy'], affectedCities: ['Peradeniya'] }),
        buildRecipient({ phone: '0752697878' }),
        delivery,
      );

      const [url, init] = fetchMock.mock.calls[0];
      const form = sentForm(fetchMock);
      expect(url).toBe('https://app.notify.lk/api/v1/send');
      expect(init.method).toBe('POST');
      expect(form.get('user_id')).toBe('1001');
      expect(form.get('api_key')).toBe('key');
      expect(form.get('sender_id')).toBe('NotifyDEMO');
      expect(form.get('to')).toBe('94752697878');
      expect(form.get('message')).toBe(
        [
          'DMC WARNING ALERT: Flood warning',
          'Area: Kandy, Peradeniya',
          'Heavy rainfall is expected',
          'Safety: Move to higher ground',
        ].join('\n'),
      );
      expect(delivery.status).toBe(DeliveryStatus.SENT);
      expect(delivery.sentAt).toBeInstanceOf(Date);
      expect(delivery.failureReason).toBeUndefined();
      expect(delivery.save).toHaveBeenCalledOnce();
    });

    it('uses the configured sender ID instead of the default', async () => {
      const fetchMock = mockGateway({ status: 'success' });

      await new SmsSender(
        buildConfig({ ...CONFIGURED, NOTIFYLK_SENDER_ID: 'DMCSL' }),
      ).send(buildAlert(), buildRecipient({ phone: '0752697878' }), buildDelivery());

      expect(sentForm(fetchMock).get('sender_id')).toBe('DMCSL');
    });

    it('omits "All Cities" from the area text', async () => {
      const fetchMock = mockGateway({ status: 'success' });

      await new SmsSender(buildConfig(CONFIGURED)).send(
        buildAlert({ affectedDistricts: ['Kandy'], affectedCities: ['All Cities'] }),
        buildRecipient({ phone: '0752697878' }),
        buildDelivery(),
      );

      const message = sentForm(fetchMock).get('message');
      expect(message).toContain('Area: Kandy\n');
      expect(message).not.toContain('All Cities');
    });

    it('truncates the SMS text to 621 characters', async () => {
      const fetchMock = mockGateway({ status: 'success' });

      await new SmsSender(buildConfig(CONFIGURED)).send(
        buildAlert({ message: 'm'.repeat(1500) }),
        buildRecipient({ phone: '0752697878' }),
        buildDelivery(),
      );

      expect(sentForm(fetchMock).get('message')).toHaveLength(621);
    });

    it.each([
      ['user ID', { NOTIFYLK_API_KEY: 'key' }],
      ['API key', { NOTIFYLK_USER_ID: '1001' }],
      ['user ID and API key', {}],
    ])('records a configuration failure when the %s is missing', async (_label, values) => {
      const fetchMock = mockGateway({ status: 'success' });
      const delivery = buildDelivery();

      await new SmsSender(buildConfig(values)).send(
        buildAlert(),
        buildRecipient({ phone: '0752697878' }),
        delivery,
      );

      expect(fetchMock).not.toHaveBeenCalled();
      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe(
        'SMS gateway (Notify.lk) configuration is incomplete',
      );
      expect(delivery.save).toHaveBeenCalledOnce();
      expect(warn).toHaveBeenCalledWith('SMS delivery failed for alert alert-1');
    });

    it('records the gateway message when the response is not a success', async () => {
      mockGateway({ status: 'failure', message: 'Invalid sender ID' });
      const delivery = buildDelivery();

      await new SmsSender(buildConfig(CONFIGURED)).send(
        buildAlert(),
        buildRecipient({ phone: '0752697878' }),
        delivery,
      );

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe('Invalid sender ID');
      expect(delivery.sentAt).toBeUndefined();
    });

    it('records the HTTP status when the gateway fails without a message', async () => {
      mockGateway({}, { ok: false, status: 502 });
      const delivery = buildDelivery();

      await new SmsSender(buildConfig(CONFIGURED)).send(
        buildAlert(),
        buildRecipient({ phone: '0752697878' }),
        delivery,
      );

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe('SMS gateway returned HTTP 502');
    });

    it('records a failure when the gateway response is not JSON', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <')),
        }),
      );
      const delivery = buildDelivery();

      await new SmsSender(buildConfig(CONFIGURED)).send(
        buildAlert(),
        buildRecipient({ phone: '0752697878' }),
        delivery,
      );

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe('SMS gateway returned HTTP 200');
    });

    it('records a network error without throwing', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ETIMEDOUT')));
      const delivery = buildDelivery();

      await expect(
        new SmsSender(buildConfig(CONFIGURED)).send(
          buildAlert(),
          buildRecipient({ phone: '0752697878' }),
          delivery,
        ),
      ).resolves.toBeUndefined();

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe('connect ETIMEDOUT');
    });

    it('records an invalid phone number as a failed delivery', async () => {
      const fetchMock = mockGateway({ status: 'success' });
      const delivery = buildDelivery();

      await new SmsSender(buildConfig(CONFIGURED)).send(
        buildAlert(),
        buildRecipient({ phone: 'not-a-number' }),
        delivery,
      );

      expect(fetchMock).not.toHaveBeenCalled();
      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe(
        'Recipient phone number must be in international format',
      );
    });
  });
});
