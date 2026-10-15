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

import { PushSender } from '../../channels/push.sender';

const firebase = vi.hoisted(() => ({
  applicationDefault: vi.fn(),
  getApps: vi.fn(),
  initializeApp: vi.fn(),
  sendEachForMulticast: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({
  applicationDefault: firebase.applicationDefault,
  getApps: firebase.getApps,
  initializeApp: firebase.initializeApp,
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({
    sendEachForMulticast: firebase.sendEachForMulticast,
  }),
}));

const CONFIGURED = { FIREBASE_PROJECT_ID: 'test-project' };

const NOT_REGISTERED = {
  success: false,
  error: { code: 'messaging/registration-token-not-registered' },
};

describe('PushSender', () => {
  let users: { updateMany: ReturnType<typeof vi.fn> };
  let warn: ReturnType<typeof vi.spyOn>;

  const createSender = (values: Record<string, string> = CONFIGURED) =>
    new PushSender(users as never, buildConfig(values));

  beforeEach(() => {
    users = { updateMany: vi.fn().mockResolvedValue({}) };
    firebase.getApps.mockReturnValue([{ name: 'existing-app' }]);
    firebase.applicationDefault.mockReturnValue('default-credential');
    firebase.initializeApp.mockReset();
    firebase.sendEachForMulticast.mockReset();
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serves the push channel', () => {
    expect(createSender().channel).toBe(NotificationChannel.PUSH);
  });

  describe('canReach', () => {
    it('is true when at least one device token is registered', () => {
      expect(createSender().canReach(buildRecipient({ fcmTokens: ['token'] }))).toBe(true);
    });

    it.each([
      ['an empty token list', { fcmTokens: [] }],
      ['no token list', {}],
    ])('is false for a recipient with %s', (_label, overrides) => {
      expect(createSender().canReach(buildRecipient(overrides))).toBe(false);
    });
  });

  describe('send', () => {
    it('sends a multicast notification and marks the delivery SENT', async () => {
      firebase.sendEachForMulticast.mockResolvedValue({
        responses: [{ success: true }, { success: true }],
      });
      const delivery = buildDelivery();

      await createSender().send(
        buildAlert({
          affectedDistricts: ['Colombo', 'Gampaha'],
          affectedCities: ['Kelaniya'],
        }),
        buildRecipient({ fcmTokens: ['token-a', 'token-b'] }),
        delivery,
      );

      expect(firebase.sendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ['token-a', 'token-b'],
          notification: {
            title: '[WARNING] Flood warning',
            body: 'Heavy rainfall is expected',
          },
          data: {
            alertId: 'alert-1',
            hazardType: 'FLOOD',
            severity: 'WARNING',
            affectedDistricts: 'Colombo,Gampaha',
            affectedCities: 'Kelaniya',
            safetyInstructions: 'Move to higher ground',
          },
        }),
      );
      expect(delivery.status).toBe(DeliveryStatus.SENT);
      expect(delivery.sentAt).toBeInstanceOf(Date);
      expect(delivery.save).toHaveBeenCalledOnce();
      expect(users.updateMany).not.toHaveBeenCalled();
    });

    it('is SENT when only some tokens are accepted and prunes the invalid ones', async () => {
      firebase.sendEachForMulticast.mockResolvedValue({
        responses: [
          { success: true },
          NOT_REGISTERED,
          {
            success: false,
            error: { code: 'messaging/invalid-registration-token' },
          },
          {
            success: false,
            error: { code: 'messaging/internal-error' },
          },
        ],
      });
      const delivery = buildDelivery();

      await createSender().send(
        buildAlert(),
        buildRecipient({ fcmTokens: ['valid', 'stale', 'malformed', 'transient'] }),
        delivery,
      );

      expect(delivery.status).toBe(DeliveryStatus.SENT);
      expect(users.updateMany).toHaveBeenCalledWith(
        {},
        { $pull: { fcmTokens: { $in: ['stale', 'malformed'] } } },
      );
    });

    it('marks the delivery FAILED when Firebase rejects every token', async () => {
      firebase.sendEachForMulticast.mockResolvedValue({
        responses: [
          { success: false, error: { code: 'messaging/internal-error' } },
        ],
      });
      const delivery = buildDelivery();

      await createSender().send(
        buildAlert(),
        buildRecipient({ fcmTokens: ['token'] }),
        delivery,
      );

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe(
        'Firebase rejected all registered device tokens',
      );
      expect(delivery.sentAt).toBeUndefined();
      expect(delivery.save).toHaveBeenCalledOnce();
      expect(users.updateMany).not.toHaveBeenCalled();
    });

    it('still prunes permanently invalid tokens when every token is rejected', async () => {
      firebase.sendEachForMulticast.mockResolvedValue({
        responses: [NOT_REGISTERED],
      });
      const delivery = buildDelivery();

      await createSender().send(
        buildAlert(),
        buildRecipient({ fcmTokens: ['stale'] }),
        delivery,
      );

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(users.updateMany).toHaveBeenCalledWith(
        {},
        { $pull: { fcmTokens: { $in: ['stale'] } } },
      );
    });

    it('initialises Firebase with the configured project when no app exists', async () => {
      firebase.getApps.mockReturnValue([]);
      firebase.sendEachForMulticast.mockResolvedValue({
        responses: [{ success: true }],
      });

      await createSender().send(
        buildAlert(),
        buildRecipient({ fcmTokens: ['token'] }),
        buildDelivery(),
      );

      expect(firebase.initializeApp).toHaveBeenCalledOnce();
      expect(firebase.initializeApp).toHaveBeenCalledWith({
        credential: 'default-credential',
        projectId: 'test-project',
      });
    });

    it('does not initialise Firebase twice', async () => {
      firebase.sendEachForMulticast.mockResolvedValue({
        responses: [{ success: true }],
      });

      await createSender().send(
        buildAlert(),
        buildRecipient({ fcmTokens: ['token'] }),
        buildDelivery(),
      );

      expect(firebase.initializeApp).not.toHaveBeenCalled();
    });

    it.each([
      ['missing', {}],
      ['empty', { FIREBASE_PROJECT_ID: '' }],
    ])('records a configuration failure when the project ID is %s', async (_label, values) => {
      const delivery = buildDelivery();

      await createSender(values).send(
        buildAlert(),
        buildRecipient({ fcmTokens: ['token'] }),
        delivery,
      );

      expect(firebase.sendEachForMulticast).not.toHaveBeenCalled();
      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe('FIREBASE_PROJECT_ID is not configured');
      expect(delivery.save).toHaveBeenCalledOnce();
      expect(warn).toHaveBeenCalledWith('Push delivery failed for alert alert-1');
    });

    it('records a Firebase error without throwing', async () => {
      firebase.sendEachForMulticast.mockRejectedValue(new Error('Firebase unavailable'));
      const delivery = buildDelivery();

      await expect(
        createSender().send(
          buildAlert(),
          buildRecipient({ fcmTokens: ['token'] }),
          delivery,
        ),
      ).resolves.toBeUndefined();

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe('Firebase unavailable');
    });

    it('records a failure when removing invalid tokens fails', async () => {
      firebase.sendEachForMulticast.mockResolvedValue({
        responses: [NOT_REGISTERED],
      });
      users.updateMany.mockRejectedValue(new Error('User store unavailable'));
      const delivery = buildDelivery();

      await createSender().send(
        buildAlert(),
        buildRecipient({ fcmTokens: ['stale'] }),
        delivery,
      );

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe('User store unavailable');
    });
  });
});
