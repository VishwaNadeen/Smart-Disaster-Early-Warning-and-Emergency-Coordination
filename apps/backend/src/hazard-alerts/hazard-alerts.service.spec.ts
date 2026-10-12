
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { HazardAlertsService } from './hazard-alerts.service';

import {
  AlertSeverity,
  HazardAlertStatus,
} from './schemas/hazard-alert.schema';

describe('HazardAlertsService', () => {
  let service: HazardAlertsService;
  let users: any;
  let alerts: any;
  let deliveries: any;

  beforeEach(() => {
    users = {
      find: vi.fn(),
      findByIdAndUpdate: vi.fn(),
      updateMany: vi.fn(),
    };

    alerts = {
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
    };

    deliveries = {
      findOneAndUpdate: vi.fn(),
      find: vi.fn(),
      aggregate: vi.fn(),
    };

    service = new HazardAlertsService(
      users,
      alerts,
      deliveries,
    );
  });

  it('normalizes whitespace and removes duplicate areas', () => {
    const result = (service as any).normalizeAreas([
      ' Colombo ',
      'Colombo',
      '  Kandy   City ',
    ]);

    expect(result).toEqual([
      'Colombo',
      'Kandy City',
    ]);
  });

  it('rejects empty area values', () => {
    expect(() =>
      (service as any).normalizeAreas([
        'Colombo',
        '   ',
      ]),
    ).toThrow('District and city values cannot be empty');
  });

  it('normalizes an international phone number', () => {
    expect(
      (service as any).normalizePhone('+94 77-123-4567'),
    ).toBe('94771234567');
  });

  it('rejects an invalid phone number', () => {
    expect(() =>
      (service as any).normalizePhone('abc'),
    ).toThrow(
      'Recipient phone number must be in international format',
    );
  });

  it('publishes an alert and dispatches notifications', async () => {
    const alert = {
      _id: 'alert-123',
      title: 'Flood warning',
      severity: AlertSeverity.WARNING,
      status: HazardAlertStatus.PUBLISHED,
    };

    alerts.create.mockResolvedValue(alert);

    const dispatchSpy = vi
      .spyOn(service, 'dispatch')
      .mockResolvedValue({
        matchedCitizens: 4,
        pushAttempts: 3,
        whatsappAttempts: 2,
        skippedWithoutEnabledChannel: 1,
      });

    const result = await service.publish(
      'officer-123',
      {
        title: ' Flood warning ',
        message: 'Heavy rainfall is expected',
        safetyInstructions: 'Move to higher ground',
        hazardType: 'FLOOD',
        severity: AlertSeverity.WARNING,
        affectedDistricts: [' Colombo '],
        affectedCities: [' Colombo '],
      },
    );

    expect(alerts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Flood warning',
        publishedBy: 'officer-123',
        affectedDistricts: ['Colombo'],
        affectedCities: ['Colombo'],
      }),
    );

    expect(dispatchSpy).toHaveBeenCalledWith(alert);

    expect(result.success).toBe(true);
    expect(result.data.dispatch.matchedCitizens).toBe(4);
  });

  it('registers an FCM token without duplicating it', async () => {
    users.findByIdAndUpdate.mockResolvedValue({
      _id: 'citizen-123',
    });

    const result = await service.registerDevice(
      'citizen-123',
      'sample-firebase-device-token-1234567890',
    );

    expect(users.findByIdAndUpdate).toHaveBeenCalledWith(
      'citizen-123',
      {
        $addToSet: {
          fcmTokens:
            'sample-firebase-device-token-1234567890',
        },
      },
      {
        new: true,
      },
    );

    expect(result.success).toBe(true);
  });

  it('rejects an empty FCM token', async () => {
    await expect(
      service.registerDevice('citizen-123', '  '),
    ).rejects.toThrow('Device token is required');
  });

  it('updates WhatsApp consent explicitly', async () => {
    users.findByIdAndUpdate.mockResolvedValue({
      whatsappOptIn: false,
    });

    const result = await service.updateWhatsappConsent(
      'citizen-123',
      false,
    );

    expect(users.findByIdAndUpdate).toHaveBeenCalledWith(
      'citizen-123',
      {
        $set: {
          whatsappOptIn: false,
          whatsappOptInAt: undefined,
        },
      },
      {
        new: true,
      },
    );

    expect(result.whatsappOptIn).toBe(false);
  });
});
