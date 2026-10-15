import { Logger } from '@nestjs/common';

import { HazardAlertDocument } from '../schemas/hazard-alert.schema';

import {
  DeliveryStatus,
  NotificationChannel,
} from '../schemas/notification-delivery.schema';

import { safeError } from '../utils/error.util';

import {
  AlertRecipient,
  DeliveryRecord,
  NotificationChannelSender,
} from './notification-channel.sender';

/**
 * Template-method base class shared by the provider senders. It owns the
 * "notification failure" exception flow: any error raised by the concrete
 * provider call is recorded on the delivery (FAILED + failure reason),
 * logged as a warning and never propagated, so one broken provider cannot
 * stop the remaining recipients from being notified.
 */
export abstract class BaseChannelSender
  implements NotificationChannelSender
{
  abstract readonly channel: NotificationChannel;

  /** Human-readable channel name used in log messages. */
  protected abstract readonly label: string;

  protected readonly logger = new Logger(this.constructor.name);

  abstract canReach(recipient: AlertRecipient): boolean;

  /**
   * Delivers the alert through the provider and records the outcome.
   *
   * @param alert The published alert being dispatched.
   * @param recipient The citizen receiving the alert.
   * @param delivery The delivery record updated with the outcome.
   */
  async send(
    alert: HazardAlertDocument,
    recipient: AlertRecipient,
    delivery: DeliveryRecord,
  ): Promise<void> {
    try {
      await this.deliver(alert, recipient, delivery);
    } catch (error: unknown) {
      delivery.status = DeliveryStatus.FAILED;
      delivery.failureReason = safeError(error);
      await delivery.save();

      this.logger.warn(
        `${this.label} delivery failed for alert ${alert._id}`,
      );
    }
  }

  /**
   * Provider-specific delivery. Must update and save the delivery record on
   * success and may throw on any failure.
   */
  protected abstract deliver(
    alert: HazardAlertDocument,
    recipient: AlertRecipient,
    delivery: DeliveryRecord,
  ): Promise<void>;
}
