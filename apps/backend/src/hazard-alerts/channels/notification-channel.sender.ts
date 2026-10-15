import { Types } from 'mongoose';

import { HazardAlertDocument } from '../schemas/hazard-alert.schema';

import {
  DeliveryStatus,
  NotificationChannel,
} from '../schemas/notification-delivery.schema';

/**
 * The subset of a citizen's profile needed to decide whether, and how, a
 * hazard alert can reach them.
 */
export interface AlertRecipient {
  _id: Types.ObjectId | string;
  phone?: string;
  fcmTokens?: string[];
  whatsappOptIn?: boolean;
}

/**
 * The part of a notification-delivery document that senders read and
 * update. Mongoose documents satisfy this structurally.
 */
export interface DeliveryRecord {
  status: DeliveryStatus;
  sentAt?: Date;
  failureReason?: string;
  providerMessageId?: string;
  save(): Promise<unknown>;
}

/**
 * Strategy contract for one notification channel (push, SMS, WhatsApp...).
 * New channels are added by implementing this interface and registering the
 * implementation under {@link NOTIFICATION_CHANNEL_SENDERS}; the dispatch
 * logic does not need to change.
 */
export interface NotificationChannelSender {
  /** The channel this sender is responsible for. */
  readonly channel: NotificationChannel;

  /**
   * Whether the recipient has the contact details / consent required by
   * this channel.
   */
  canReach(recipient: AlertRecipient): boolean;

  /**
   * Delivers the alert and records the outcome on the delivery record.
   * Implementations must not throw for provider failures; they record
   * `FAILED` plus a failure reason instead.
   */
  send(
    alert: HazardAlertDocument,
    recipient: AlertRecipient,
    delivery: DeliveryRecord,
  ): Promise<void>;
}

/** Dependency-injection token for the list of registered channel senders. */
export const NOTIFICATION_CHANNEL_SENDERS = Symbol(
  'NOTIFICATION_CHANNEL_SENDERS',
);

/** Channels used when an alert does not specify any. */
export const DEFAULT_NOTIFICATION_CHANNELS: readonly NotificationChannel[] = [
  NotificationChannel.SMS,
  NotificationChannel.PUSH,
  NotificationChannel.WHATSAPP,
];
