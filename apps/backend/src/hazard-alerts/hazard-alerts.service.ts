import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  HazardAlert,
  HazardAlertDocument,
  HazardAlertStatus,
} from './schemas/hazard-alert.schema';

import {
  DeliveryStatus,
  NotificationChannel,
  NotificationDelivery,
} from './schemas/notification-delivery.schema';

import {
  DisasterReport,
  ReportStatus,
} from '../reports/schemas/report.schema';

import { CreateHazardAlertDto } from './dto/create-hazard-alert.dto';

import {
  DEFAULT_NOTIFICATION_CHANNELS,
  DeliveryRecord,
  NOTIFICATION_CHANNEL_SENDERS,
  NotificationChannelSender,
  AlertRecipient,
} from './channels/notification-channel.sender';

import { RecipientResolver } from './recipient.resolver';

import {
  isDuplicateKeyError,
  safeError,
} from './utils/error.util';

/** Counters describing the outcome of one dispatch run. */
export interface DispatchSummary {
  matchedCitizens: number;
  pushAttempts: number;
  whatsappAttempts: number;
  smsAttempts: number;
  failedAttempts: number;
  skippedWithoutEnabledChannel: number;
  /** True when dispatch itself crashed (the alert is still published). */
  dispatchError: boolean;
}


@Injectable()
export class HazardAlertsService {
  private readonly logger =
    new Logger(HazardAlertsService.name);

  constructor(
    @InjectModel(HazardAlert.name)
    private readonly alerts: Model<HazardAlertDocument>,

    @InjectModel(NotificationDelivery.name)
    private readonly deliveries: Model<NotificationDelivery>,

    @InjectModel(DisasterReport.name)
    private readonly reports: Model<DisasterReport>,

    private readonly recipientResolver: RecipientResolver,

    @Inject(NOTIFICATION_CHANNEL_SENDERS)
    private readonly senders: NotificationChannelSender[],
  ) {}

  /**
   * Validates, stores and dispatches a new hazard alert.
   *
   * @param publisherId ID of the officer issuing the alert.
   * @param dto The alert content, affected areas and optional channels /
   * verified source report.
   * @returns The stored alert together with the dispatch summary.
   * @throws BadRequestException when an area is blank or the source report
   * is not verified.
   * @throws NotFoundException when the source report does not exist.
   * @throws Error when the alert cannot be stored (system error).
   */
  async publish(
    publisherId: string,
    dto: CreateHazardAlertDto,
  ) {
    const districts = this.normalizeAreas(
      dto.affectedDistricts,
    );

    const cities = this.normalizeAreas(
      dto.affectedCities,
    );

    const sourceReportNumber = await this.resolveSourceReportNumber(
      dto.sourceReportId,
    );

    const notificationChannels = [
      ...new Set(
        dto.notificationChannels?.length
          ? dto.notificationChannels
          : DEFAULT_NOTIFICATION_CHANNELS,
      ),
    ];

    let alert: HazardAlertDocument;

    try {
      alert = await this.alerts.create({
        title: dto.title.trim(),
        message: dto.message.trim(),
        safetyInstructions: dto.safetyInstructions.trim(),
        hazardType: dto.hazardType.trim(),
        severity: dto.severity,
        affectedDistricts: districts,
        affectedCities: cities,
        notificationChannels,
        sourceReportId: dto.sourceReportId,
        sourceReportNumber,
        publishedBy: publisherId,
        status: HazardAlertStatus.PUBLISHED,
        publishedAt: new Date(),
      });
    } catch (error: unknown) {
      this.logger.error(
        'Failed to store hazard alert',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    // Do not fail publication because a notification provider
    // is temporarily unavailable.
    let dispatch: DispatchSummary;

    try {
      dispatch = await this.dispatch(alert);
    } catch (error: unknown) {
      this.logger.error(
        `Alert ${alert._id} was published, but notification dispatch could not be completed`,
        error instanceof Error ? error.stack : undefined,
      );
      dispatch = {
        matchedCitizens: 0,
        pushAttempts: 0,
        whatsappAttempts: 0,
        smsAttempts: 0,
        failedAttempts: 0,
        skippedWithoutEnabledChannel: 0,
        dispatchError: true,
      };
    }

    return {
      success: true,
      message: 'Hazard alert published',
      data: {
        alert,
        dispatch,
      },
    };
  }

  /**
   * Sends a published alert to every matching citizen through each
   * requested channel they can be reached on. Existing delivery records are
   * reused, so re-dispatching never notifies a citizen twice on a channel.
   *
   * @param alert The published alert.
   * @returns Per-channel attempt counts, failures and skipped citizens.
   * @throws Error when recipients or delivery records cannot be read or
   * stored (system error); provider failures are NOT thrown.
   */
  async dispatch(
    alert: HazardAlertDocument,
  ): Promise<DispatchSummary> {
    const recipients =
      await this.recipientResolver.findCitizensForAlert(alert);

    const activeSenders = this.sendersForAlert(alert);

    const attempts: Record<NotificationChannel, number> = {
      [NotificationChannel.PUSH]: 0,
      [NotificationChannel.WHATSAPP]: 0,
      [NotificationChannel.SMS]: 0,
    };

    let failedAttempts = 0;
    let skipped = 0;

    for (const recipient of recipients) {
      const reachableVia = activeSenders.filter((sender) =>
        sender.canReach(recipient),
      );

      if (reachableVia.length === 0) {
        skipped++;
        continue;
      }

      for (const sender of reachableVia) {
        const delivery = await this.attemptDelivery(
          alert,
          recipient,
          sender,
        );

        if (!delivery) {
          continue;
        }

        attempts[sender.channel]++;

        if (delivery.status === DeliveryStatus.FAILED) {
          failedAttempts++;
        }
      }
    }

    return {
      matchedCitizens: recipients.length,
      pushAttempts: attempts[NotificationChannel.PUSH],
      whatsappAttempts: attempts[NotificationChannel.WHATSAPP],
      smsAttempts: attempts[NotificationChannel.SMS],
      failedAttempts,
      skippedWithoutEnabledChannel: skipped,
      dispatchError: false,
    };
  }

  /**
   * Lists published (not cancelled) alerts, newest first, for citizens.
   */
  async listPublished() {
    const data = await this.alerts
      .find({
        status: HazardAlertStatus.PUBLISHED,
      })
      .sort({ publishedAt: -1 })
      .lean()
      .exec();

    return {
      success: true,
      data,
    };
  }

  /**
   * Lists every alert, including cancelled ones, newest first, for the
   * officer alert history.
   */
  async listAll() {
    const data = await this.alerts
      .find({})
      .sort({ publishedAt: -1 })
      .lean()
      .exec();

    return {
      success: true,
      data,
    };
  }

  /**
   * Returns a single published alert.
   *
   * @param id The alert ID.
   * @throws NotFoundException when the alert is missing or not published.
   */
  async getPublishedById(id: string) {
    const alert = await this.alerts
      .findOne({
        _id: id,
        status: HazardAlertStatus.PUBLISHED,
      })
      .lean()
      .exec();

    if (!alert) {
      throw new NotFoundException(
        'Published hazard alert not found',
      );
    }

    return {
      success: true,
      data: alert,
    };
  }

  /**
   * Returns the per-recipient delivery records of an alert plus an
   * aggregated count per channel and status.
   *
   * @param alertId The alert ID.
   * @throws NotFoundException when the alert does not exist.
   */
  async listDeliveries(alertId: string) {
    const alert = await this.alerts.findById(alertId);

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const [records, summary] = await Promise.all([
      this.deliveries
        .find({ alertId })
        .select(
          'recipientId channel status providerMessageId failureReason sentAt deliveredAt createdAt',
        )
        .sort({ createdAt: -1 })
        .lean()
        .exec(),

      this.deliveries.aggregate([
        { $match: { alertId } },
        {
          $group: {
            _id: {
              channel: '$channel',
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      success: true,
      data: {
        records,
        summary,
      },
    };
  }

  /**
   * Cancels an alert. Cancelling an already cancelled alert is a no-op.
   *
   * @param alertId The alert ID.
   * @param reason Why the alert is withdrawn (surrounding spaces ignored).
   * @throws NotFoundException when the alert does not exist.
   */
  async cancelAlert(
    alertId: string,
    reason: string,
  ) {
    const alert = await this.alerts.findById(alertId);

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.status === HazardAlertStatus.CANCELLED) {
      return {
        success: true,
        message: 'Alert is already cancelled',
      };
    }

    alert.status = HazardAlertStatus.CANCELLED;
    alert.cancelledAt = new Date();
    alert.cancellationReason = reason.trim();

    await alert.save();

    return {
      success: true,
      message: 'Alert cancelled',
    };
  }

  /**
   * Looks up the verified incident report an alert is based on.
   *
   * @returns The report number, or undefined when no report is linked.
   */
  private async resolveSourceReportNumber(
    sourceReportId?: string,
  ): Promise<string | undefined> {
    if (!sourceReportId) {
      return undefined;
    }

    const sourceReport = await this.reports
      .findById(sourceReportId)
      .lean()
      .exec();

    if (!sourceReport) {
      throw new NotFoundException(
        'Source incident report not found',
      );
    }

    if (sourceReport.status !== ReportStatus.VERIFIED) {
      throw new BadRequestException(
        'Only a verified incident report can be used to create an alert',
      );
    }

    return sourceReport.reportNumber;
  }

  /** Selects the registered senders for the channels the alert requests. */
  private sendersForAlert(
    alert: HazardAlertDocument,
  ): NotificationChannelSender[] {
    const requestedChannels = alert.notificationChannels?.length
      ? alert.notificationChannels
      : DEFAULT_NOTIFICATION_CHANNELS;

    return this.senders.filter((sender) =>
      requestedChannels.includes(sender.channel),
    );
  }

  /**
   * Creates (or finds) the unique delivery record for the alert, recipient
   * and channel and, unless it was already handled, sends through the
   * channel.
   *
   * @returns The delivery that was attempted, or null when it was skipped
   * (duplicate created concurrently, or already SENT / DELIVERED).
   */
  private async attemptDelivery(
    alert: HazardAlertDocument,
    recipient: AlertRecipient,
    sender: NotificationChannelSender,
  ): Promise<DeliveryRecord | null> {
    const delivery = await this.findOrCreateDelivery(
      String(alert._id),
      String(recipient._id),
      sender.channel,
    );

    // Do not send again when a previous attempt was accepted
    // or confirmed delivered by the provider.
    if (
      !delivery ||
      delivery.status === DeliveryStatus.SENT ||
      delivery.status === DeliveryStatus.DELIVERED
    ) {
      return null;
    }

    try {
      await sender.send(alert, recipient, delivery);
    } catch (error: unknown) {
      // Senders record provider errors themselves; this guards against a
      // sender breaking its contract so the run can continue.
      this.logger.error(
        `${sender.channel} sender failed unexpectedly for alert ${alert._id}`,
        error instanceof Error ? error.stack : undefined,
      );
      delivery.status = DeliveryStatus.FAILED;
      delivery.failureReason = safeError(error);
      await delivery.save();
    }

    return delivery;
  }

  /**
   * The unique index prevents duplicate deliveries when a request is
   * retried or the same alert is dispatched again.
   *
   * @returns The delivery record, or null when a concurrent run created it
   * first (duplicate key).
   */
  private async findOrCreateDelivery(
    alertId: string,
    recipientId: string,
    channel: NotificationChannel,
  ): Promise<DeliveryRecord | null> {
    try {
      return await this.deliveries.findOneAndUpdate(
        {
          alertId,
          recipientId,
          channel,
        },
        {
          $setOnInsert: {
            alertId,
            recipientId,
            channel,
            status: DeliveryStatus.PENDING,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Trims, collapses inner whitespace and de-duplicates district / city
   * names.
   *
   * @throws BadRequestException when any value is blank.
   */
  private normalizeAreas(values: string[]): string[] {
    const normalized = [
      ...new Set(
        values.map((value) =>
          value.trim().replace(/\s+/g, ' '),
        ),
      ),
    ];

    if (normalized.some((value) => !value)) {
      throw new BadRequestException(
        'District and city values cannot be empty',
      );
    }

    return normalized;
  }
}
