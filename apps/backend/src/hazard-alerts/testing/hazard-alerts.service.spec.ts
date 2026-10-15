import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HazardAlertsService } from '../hazard-alerts.service';

import { AlertRecipient } from '../channels/notification-channel.sender';

import {
  AlertSeverity,
  HazardAlertStatus,
} from '../schemas/hazard-alert.schema';

import {
  DeliveryStatus,
  NotificationChannel,
} from '../schemas/notification-delivery.schema';

import { ReportStatus } from '../../reports/schemas/report.schema';

import {
  buildAlert,
  buildCreateDto,
  buildDelivery,
  buildQuery,
  buildRecipient,
  FakeSender,
} from './test-builders-spec';

const { PUSH, WHATSAPP, SMS } = NotificationChannel;

const NO_ATTEMPTS = {
  matchedCitizens: 0,
  pushAttempts: 0,
  whatsappAttempts: 0,
  smsAttempts: 0,
  failedAttempts: 0,
  skippedWithoutEnabledChannel: 0,
  dispatchError: false,
};

describe('HazardAlertsService', () => {
  let alerts: Record<'create' | 'find' | 'findOne' | 'findById', ReturnType<typeof vi.fn>>;
  let deliveries: Record<'findOneAndUpdate' | 'find' | 'aggregate', ReturnType<typeof vi.fn>>;
  let reports: { findById: ReturnType<typeof vi.fn> };
  let resolver: { findCitizensForAlert: ReturnType<typeof vi.fn> };
  let push: FakeSender;
  let whatsapp: FakeSender;
  let sms: FakeSender;
  let service: HazardAlertsService;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    alerts = {
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      findById: vi.fn(),
    };
    deliveries = {
      findOneAndUpdate: vi.fn().mockImplementation(async () => buildDelivery()),
      find: vi.fn(),
      aggregate: vi.fn(),
    };
    reports = { findById: vi.fn() };
    resolver = { findCitizensForAlert: vi.fn().mockResolvedValue([]) };

    push = new FakeSender(PUSH, (r: AlertRecipient) => (r.fcmTokens?.length ?? 0) > 0);
    whatsapp = new FakeSender(WHATSAPP, (r: AlertRecipient) => r.whatsappOptIn === true && !!r.phone);
    sms = new FakeSender(SMS, (r: AlertRecipient) => !!r.phone);

    service = new HazardAlertsService(
      alerts as never,
      deliveries as never,
      reports as never,
      resolver as never,
      [push, whatsapp, sms],
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('publish', () => {
    beforeEach(() => {
      alerts.create.mockImplementation(async (data: object) => ({ _id: 'alert-new', ...data }));
      vi.spyOn(service, 'dispatch').mockResolvedValue({
        ...NO_ATTEMPTS,
        matchedCitizens: 4,
        pushAttempts: 3,
      });
    });

    it('stores a trimmed PUBLISHED alert and returns the dispatch summary', async () => {
      const result = await service.publish(
        'officer-123',
        buildCreateDto({
          title: ' Flood warning ',
          message: ' Heavy rain ',
          safetyInstructions: ' Move up ',
          hazardType: ' FLOOD ',
          severity: AlertSeverity.EMERGENCY,
        }),
      );

      expect(alerts.create).toHaveBeenCalledWith({
        title: 'Flood warning',
        message: 'Heavy rain',
        safetyInstructions: 'Move up',
        hazardType: 'FLOOD',
        severity: AlertSeverity.EMERGENCY,
        affectedDistricts: ['Colombo'],
        affectedCities: ['Kelaniya'],
        notificationChannels: [SMS, PUSH, WHATSAPP],
        sourceReportId: undefined,
        sourceReportNumber: undefined,
        publishedBy: 'officer-123',
        status: HazardAlertStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      });
      expect(service.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'alert-new' }),
      );
      expect(result).toMatchObject({
        success: true,
        message: 'Hazard alert published',
        data: { dispatch: { matchedCitizens: 4, pushAttempts: 3 } },
      });
    });

    it('normalises whitespace and removes duplicate areas', async () => {
      await service.publish(
        'officer-123',
        buildCreateDto({
          affectedDistricts: [' Colombo ', 'Colombo', '  Kandy   City '],
          affectedCities: [' Kelaniya ', 'Kelaniya'],
        }),
      );

      expect(alerts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          affectedDistricts: ['Colombo', 'Kandy City'],
          affectedCities: ['Kelaniya'],
        }),
      );
    });

    it.each([
      ['district', { affectedDistricts: ['Colombo', '   '] }],
      ['city', { affectedCities: [''] }],
    ])('rejects a blank %s and stores nothing', async (_label, overrides) => {
      await expect(
        service.publish('officer-123', buildCreateDto(overrides)),
      ).rejects.toThrow(
        new BadRequestException('District and city values cannot be empty'),
      );

      expect(alerts.create).not.toHaveBeenCalled();
      expect(service.dispatch).not.toHaveBeenCalled();
    });

    it('persists the selected channels without duplicates', async () => {
      await service.publish(
        'officer-123',
        buildCreateDto({ notificationChannels: [WHATSAPP, WHATSAPP] }),
      );

      expect(alerts.create).toHaveBeenCalledWith(
        expect.objectContaining({ notificationChannels: [WHATSAPP] }),
      );
    });

    it('falls back to every channel when an empty list is given', async () => {
      await service.publish(
        'officer-123',
        buildCreateDto({ notificationChannels: [] }),
      );

      expect(alerts.create).toHaveBeenCalledWith(
        expect.objectContaining({ notificationChannels: [SMS, PUSH, WHATSAPP] }),
      );
    });

    describe('with a source report', () => {
      it('links a verified report and its report number', async () => {
        reports.findById.mockReturnValue(
          buildQuery({ status: ReportStatus.VERIFIED, reportNumber: 'RPT-2026-100' }),
        );

        await service.publish(
          'officer-123',
          buildCreateDto({ sourceReportId: 'report-456' }),
        );

        expect(reports.findById).toHaveBeenCalledWith('report-456');
        expect(alerts.create).toHaveBeenCalledWith(
          expect.objectContaining({
            sourceReportId: 'report-456',
            sourceReportNumber: 'RPT-2026-100',
          }),
        );
      });

      it('rejects a report that is not verified', async () => {
        reports.findById.mockReturnValue(
          buildQuery({ status: ReportStatus.PENDING_VERIFICATION }),
        );

        await expect(
          service.publish('officer-123', buildCreateDto({ sourceReportId: 'report-123' })),
        ).rejects.toThrow(
          new BadRequestException(
            'Only a verified incident report can be used to create an alert',
          ),
        );

        expect(alerts.create).not.toHaveBeenCalled();
      });

      it('rejects a report that cannot be found', async () => {
        reports.findById.mockReturnValue(buildQuery(null));

        await expect(
          service.publish('officer-123', buildCreateDto({ sourceReportId: 'report-404' })),
        ).rejects.toThrow(new NotFoundException('Source incident report not found'));

        expect(alerts.create).not.toHaveBeenCalled();
      });
    });

    it('keeps the alert published and flags dispatchError when dispatch crashes', async () => {
      vi.spyOn(service, 'dispatch').mockRejectedValue(
        new Error('Recipient registry unavailable'),
      );

      const result = await service.publish('officer-123', buildCreateDto());

      expect(result.success).toBe(true);
      expect(result.data.alert).toMatchObject({ _id: 'alert-new' });
      expect(result.data.dispatch).toEqual({ ...NO_ATTEMPTS, dispatchError: true });
    });

    it('does not hide alert persistence errors and does not dispatch', async () => {
      const error = new Error('Database unavailable');
      alerts.create.mockRejectedValue(error);

      await expect(service.publish('officer-123', buildCreateDto())).rejects.toBe(error);

      expect(service.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('dispatch', () => {
    const citizenWithEverything = buildRecipient({
      _id: 'citizen-all',
      phone: '+94771234567',
      fcmTokens: ['device-token'],
      whatsappOptIn: true,
    });

    const dispatchFor = (
      recipients: AlertRecipient[],
      alertOverrides: Record<string, unknown> = {},
    ) => {
      resolver.findCitizensForAlert.mockResolvedValue(recipients);

      return service.dispatch(buildAlert(alertOverrides));
    };

    it('resolves recipients for the alert', async () => {
      const alert = buildAlert();

      await service.dispatch(alert);

      expect(resolver.findCitizensForAlert).toHaveBeenCalledWith(alert);
    });

    it('returns zero counters when nobody is in the affected area', async () => {
      await expect(dispatchFor([])).resolves.toEqual(NO_ATTEMPTS);
    });

    it('dispatches only through the selected channels', async () => {
      const result = await dispatchFor([citizenWithEverything], {
        notificationChannels: [PUSH],
      });

      expect(push.send).toHaveBeenCalledOnce();
      expect(whatsapp.send).not.toHaveBeenCalled();
      expect(sms.send).not.toHaveBeenCalled();
      expect(result).toEqual({
        ...NO_ATTEMPTS,
        matchedCitizens: 1,
        pushAttempts: 1,
      });
    });

    it('passes the alert, recipient and unique delivery record to the sender', async () => {
      const delivery = buildDelivery();
      deliveries.findOneAndUpdate.mockResolvedValue(delivery);
      const alert = buildAlert({ _id: 'alert-789', notificationChannels: [PUSH] });
      resolver.findCitizensForAlert.mockResolvedValue([citizenWithEverything]);

      await service.dispatch(alert);

      expect(push.send).toHaveBeenCalledWith(alert, citizenWithEverything, delivery);
      expect(deliveries.findOneAndUpdate).toHaveBeenCalledWith(
        { alertId: 'alert-789', recipientId: 'citizen-all', channel: PUSH },
        {
          $setOnInsert: {
            alertId: 'alert-789',
            recipientId: 'citizen-all',
            channel: PUSH,
            status: DeliveryStatus.PENDING,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    });

    it('uses every channel when the alert does not list any', async () => {
      const result = await dispatchFor([citizenWithEverything], {
        notificationChannels: [],
      });

      expect(result).toEqual({
        ...NO_ATTEMPTS,
        matchedCitizens: 1,
        pushAttempts: 1,
        whatsappAttempts: 1,
        smsAttempts: 1,
      });
    });

    it('counts attempts per channel across several citizens', async () => {
      const smsOnly = buildRecipient({ _id: 'citizen-sms', phone: '0752697878' });
      const pushOnly = buildRecipient({ _id: 'citizen-push', fcmTokens: ['t'] });

      const result = await dispatchFor([citizenWithEverything, smsOnly, pushOnly]);

      expect(result).toEqual({
        ...NO_ATTEMPTS,
        matchedCitizens: 3,
        pushAttempts: 2,
        whatsappAttempts: 1,
        smsAttempts: 2,
      });
      expect(sms.send).toHaveBeenCalledWith(
        expect.anything(),
        smsOnly,
        expect.anything(),
      );
    });

    it('skips channels the recipient cannot be reached on', async () => {
      const noConsent = buildRecipient({
        _id: 'citizen-no-consent',
        phone: '0752697878',
        whatsappOptIn: false,
      });

      const result = await dispatchFor([noConsent], {
        notificationChannels: [WHATSAPP, SMS],
      });

      expect(whatsapp.send).not.toHaveBeenCalled();
      expect(sms.send).toHaveBeenCalledOnce();
      expect(result.whatsappAttempts).toBe(0);
      expect(result.smsAttempts).toBe(1);
    });

    it('counts citizens without any reachable selected channel as skipped', async () => {
      const unreachable = buildRecipient({
        _id: 'citizen-none',
        fcmTokens: [],
        phone: '+94771234567',
        whatsappOptIn: false,
      });

      const result = await dispatchFor([unreachable], {
        notificationChannels: [PUSH, WHATSAPP],
      });

      expect(result).toEqual({
        ...NO_ATTEMPTS,
        matchedCitizens: 1,
        skippedWithoutEnabledChannel: 1,
      });
      expect(deliveries.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('ignores requested channels that have no registered sender', async () => {
      const result = await dispatchFor([citizenWithEverything], {
        notificationChannels: ['TELEGRAM'],
      });

      expect(result).toEqual({
        ...NO_ATTEMPTS,
        matchedCitizens: 1,
        skippedWithoutEnabledChannel: 1,
      });
      expect(deliveries.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it.each([[DeliveryStatus.SENT], [DeliveryStatus.DELIVERED]])(
      'does not send again when the delivery is already %s',
      async (status) => {
        deliveries.findOneAndUpdate.mockResolvedValue(buildDelivery({ status }));

        const result = await dispatchFor([citizenWithEverything], {
          notificationChannels: [PUSH],
        });

        expect(push.send).not.toHaveBeenCalled();
        expect(result.pushAttempts).toBe(0);
        expect(result.failedAttempts).toBe(0);
        expect(result.skippedWithoutEnabledChannel).toBe(0);
      },
    );

    it.each([[DeliveryStatus.PENDING], [DeliveryStatus.FAILED]])(
      'sends again when the previous delivery is %s',
      async (status) => {
        deliveries.findOneAndUpdate.mockResolvedValue(buildDelivery({ status }));

        const result = await dispatchFor([citizenWithEverything], {
          notificationChannels: [PUSH],
        });

        expect(push.send).toHaveBeenCalledOnce();
        expect(result.pushAttempts).toBe(1);
      },
    );

    it('ignores duplicate delivery records created by a concurrent retry', async () => {
      deliveries.findOneAndUpdate.mockRejectedValue({ code: 11000 });

      const result = await dispatchFor([citizenWithEverything], {
        notificationChannels: [PUSH],
      });

      expect(push.send).not.toHaveBeenCalled();
      expect(result.pushAttempts).toBe(0);
      expect(result.failedAttempts).toBe(0);
    });

    it('surfaces non-duplicate delivery persistence errors', async () => {
      deliveries.findOneAndUpdate.mockRejectedValue(new Error('Delivery store unavailable'));

      await expect(
        dispatchFor([citizenWithEverything], { notificationChannels: [PUSH] }),
      ).rejects.toThrow('Delivery store unavailable');
    });

    it('surfaces recipient lookup errors', async () => {
      resolver.findCitizensForAlert.mockRejectedValue(new Error('Recipient registry unavailable'));

      await expect(service.dispatch(buildAlert())).rejects.toThrow(
        'Recipient registry unavailable',
      );
    });

    it('counts provider delivery failures reported by a sender', async () => {
      push.send.mockImplementation(async (_alert, _recipient, delivery) => {
        delivery.status = DeliveryStatus.FAILED;
      });

      const result = await dispatchFor([citizenWithEverything], {
        notificationChannels: [PUSH, SMS],
      });

      expect(result).toEqual({
        ...NO_ATTEMPTS,
        matchedCitizens: 1,
        pushAttempts: 1,
        smsAttempts: 1,
        failedAttempts: 1,
      });
    });

    it('records a sender that throws unexpectedly as failed and keeps going', async () => {
      const delivery = buildDelivery();
      deliveries.findOneAndUpdate.mockResolvedValueOnce(delivery);
      push.send.mockRejectedValueOnce(new Error('Sender crashed'));
      const next = buildRecipient({ _id: 'citizen-next', fcmTokens: ['t2'] });

      const result = await dispatchFor([citizenWithEverything, next], {
        notificationChannels: [PUSH],
      });

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureReason).toBe('Sender crashed');
      expect(delivery.save).toHaveBeenCalledOnce();
      expect(push.send).toHaveBeenCalledTimes(2);
      expect(result.pushAttempts).toBe(2);
      expect(result.failedAttempts).toBe(1);
    });
  });

  describe('listPublished', () => {
    it('returns only published alerts, newest first', async () => {
      const published = [{ _id: 'a1' }];
      const query = buildQuery(published);
      alerts.find.mockReturnValue(query);

      const result = await service.listPublished();

      expect(alerts.find).toHaveBeenCalledWith({ status: HazardAlertStatus.PUBLISHED });
      expect(query.sort).toHaveBeenCalledWith({ publishedAt: -1 });
      expect(result).toEqual({ success: true, data: published });
    });
  });

  describe('listAll', () => {
    it('returns every alert, including cancelled ones, newest first', async () => {
      const history = [
        { _id: 'a1', status: HazardAlertStatus.PUBLISHED },
        { _id: 'a2', status: HazardAlertStatus.CANCELLED },
      ];
      const query = buildQuery(history);
      alerts.find.mockReturnValue(query);

      const result = await service.listAll();

      expect(alerts.find).toHaveBeenCalledWith({});
      expect(query.sort).toHaveBeenCalledWith({ publishedAt: -1 });
      expect(result).toEqual({ success: true, data: history });
    });
  });

  describe('getPublishedById', () => {
    it('returns a published alert', async () => {
      const alert = { _id: 'alert-by-id' };
      alerts.findOne.mockReturnValue(buildQuery(alert));

      await expect(service.getPublishedById('alert-by-id')).resolves.toEqual({
        success: true,
        data: alert,
      });
      expect(alerts.findOne).toHaveBeenCalledWith({
        _id: 'alert-by-id',
        status: HazardAlertStatus.PUBLISHED,
      });
    });

    it('rejects a missing or unpublished alert', async () => {
      alerts.findOne.mockReturnValue(buildQuery(null));

      await expect(service.getPublishedById('missing-alert')).rejects.toThrow(
        new NotFoundException('Published hazard alert not found'),
      );
    });
  });

  describe('listDeliveries', () => {
    it('returns delivery records and an aggregate summary', async () => {
      const records = [{ recipientId: 'citizen-1' }];
      const summary = [{ _id: { channel: 'PUSH', status: 'SENT' }, count: 1 }];
      const query = buildQuery(records);
      alerts.findById.mockResolvedValue({ _id: 'alert-1' });
      deliveries.find.mockReturnValue(query);
      deliveries.aggregate.mockResolvedValue(summary);

      const result = await service.listDeliveries('alert-1');

      expect(deliveries.find).toHaveBeenCalledWith({ alertId: 'alert-1' });
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(deliveries.aggregate).toHaveBeenCalledWith([
        { $match: { alertId: 'alert-1' } },
        {
          $group: {
            _id: { channel: '$channel', status: '$status' },
            count: { $sum: 1 },
          },
        },
      ]);
      expect(result).toEqual({ success: true, data: { records, summary } });
    });

    it('rejects a missing alert without querying deliveries', async () => {
      alerts.findById.mockResolvedValue(null);

      await expect(service.listDeliveries('missing-alert')).rejects.toThrow(
        new NotFoundException('Alert not found'),
      );

      expect(deliveries.find).not.toHaveBeenCalled();
    });
  });

  describe('cancelAlert', () => {
    it('cancels a published alert and stores the trimmed reason', async () => {
      const alert = {
        status: HazardAlertStatus.PUBLISHED,
        cancelledAt: undefined as Date | undefined,
        cancellationReason: undefined as string | undefined,
        save: vi.fn().mockResolvedValue(undefined),
      };
      alerts.findById.mockResolvedValue(alert);

      await expect(
        service.cancelAlert('alert-1', '  Threat has passed  '),
      ).resolves.toEqual({ success: true, message: 'Alert cancelled' });

      expect(alert.status).toBe(HazardAlertStatus.CANCELLED);
      expect(alert.cancellationReason).toBe('Threat has passed');
      expect(alert.cancelledAt).toBeInstanceOf(Date);
      expect(alert.save).toHaveBeenCalledOnce();
    });

    it('is idempotent for an already cancelled alert', async () => {
      const alert = {
        status: HazardAlertStatus.CANCELLED,
        save: vi.fn(),
      };
      alerts.findById.mockResolvedValue(alert);

      await expect(
        service.cancelAlert('alert-1', 'No longer needed'),
      ).resolves.toEqual({ success: true, message: 'Alert is already cancelled' });

      expect(alert.save).not.toHaveBeenCalled();
    });

    it('rejects a missing alert', async () => {
      alerts.findById.mockResolvedValue(null);

      await expect(service.cancelAlert('missing-alert', 'Reason provided')).rejects.toThrow(
        new NotFoundException('Alert not found'),
      );
    });
  });
});
