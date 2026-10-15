import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HazardAlertDocument } from '../schemas/hazard-alert.schema';

import {
  DeliveryStatus,
  NotificationChannel,
} from '../schemas/notification-delivery.schema';

import { normalizePhone } from '../utils/phone.util';

import { BaseChannelSender } from './base-channel.sender';

import {
  AlertRecipient,
  DeliveryRecord,
} from './notification-channel.sender';

const NOTIFYLK_SEND_URL = 'https://app.notify.lk/api/v1/send';
const DEFAULT_SENDER_ID = 'NotifyDEMO';
const REQUEST_TIMEOUT_MS = 15000;

// Maximum length accepted by Notify.lk for a single request.
const MAX_SMS_LENGTH = 621;

const ALL_CITIES = 'all cities';

interface NotifyLkResponse {
  status?: string;
  message?: string;
}

/**
 * Sends hazard alerts as SMS messages through the Notify.lk gateway.
 */
@Injectable()
export class SmsSender extends BaseChannelSender {
  readonly channel = NotificationChannel.SMS;

  protected readonly label = 'SMS';

  constructor(private readonly config: ConfigService) {
    super();
  }

  /** A recipient is reachable when a phone number is on record. */
  canReach(recipient: AlertRecipient): boolean {
    return Boolean(recipient.phone);
  }

  protected async deliver(
    alert: HazardAlertDocument,
    recipient: AlertRecipient,
    delivery: DeliveryRecord,
  ): Promise<void> {
    const { userId, apiKey, senderId } = this.gatewayConfig;

    if (!userId || !apiKey) {
      throw new Error(
        'SMS gateway (Notify.lk) configuration is incomplete',
      );
    }

    const response = await fetch(NOTIFYLK_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        user_id: userId,
        api_key: apiKey,
        sender_id: senderId,
        to: normalizePhone(recipient.phone ?? ''),
        message: this.buildMessage(alert),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const result = (await response
      .json()
      .catch(() => null)) as NotifyLkResponse | null;

    if (!response.ok || result?.status !== 'success') {
      throw new Error(
        result?.message ||
          `SMS gateway returned HTTP ${response.status}`,
      );
    }

    delivery.status = DeliveryStatus.SENT;
    delivery.sentAt = new Date();
    await delivery.save();
  }

  /** Builds the plain-text SMS body, truncated to the gateway limit. */
  private buildMessage(alert: HazardAlertDocument): string {
    const areas = [
      ...alert.affectedDistricts,
      ...alert.affectedCities.filter(
        (city) => city.toLowerCase() !== ALL_CITIES,
      ),
    ].join(', ');

    return [
      `DMC ${alert.severity} ALERT: ${alert.title}`,
      `Area: ${areas}`,
      alert.message,
      `Safety: ${alert.safetyInstructions}`,
    ]
      .join('\n')
      .slice(0, MAX_SMS_LENGTH);
  }

  private get gatewayConfig() {
    return {
      userId: this.config.get<string>('NOTIFYLK_USER_ID'),
      apiKey: this.config.get<string>('NOTIFYLK_API_KEY'),
      senderId:
        this.config.get<string>('NOTIFYLK_SENDER_ID') ||
        DEFAULT_SENDER_ID,
    };
  }
}
