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

const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_TEMPLATE_LANGUAGE = 'en';

interface WhatsAppApiResponse {
  messages?: { id?: string }[];
  error?: { message?: string };
}

interface WhatsAppConfig {
  accessToken?: string;
  phoneNumberId?: string;
  version?: string;
  templateName?: string;
  language: string;
}

/**
 * Sends hazard alerts as pre-approved WhatsApp template messages through the
 * Meta Graph (Cloud) API. Only citizens who opted in are reachable.
 */
@Injectable()
export class WhatsAppSender extends BaseChannelSender {
  readonly channel = NotificationChannel.WHATSAPP;

  protected readonly label = 'WhatsApp';

  constructor(private readonly config: ConfigService) {
    super();
  }

  /** A recipient is reachable only with recorded consent and a phone number. */
  canReach(recipient: AlertRecipient): boolean {
    return recipient.whatsappOptIn === true && Boolean(recipient.phone);
  }

  protected async deliver(
    alert: HazardAlertDocument,
    recipient: AlertRecipient,
    delivery: DeliveryRecord,
  ): Promise<void> {
    const { accessToken, phoneNumberId, version, templateName, language } =
      this.apiConfig;

    if (!accessToken || !phoneNumberId || !version || !templateName) {
      throw new Error('WhatsApp Cloud API configuration is incomplete');
    }

    const response = await fetch(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizePhone(recipient.phone ?? ''),
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: language,
            },
            components: [
              {
                type: 'body',
                parameters: this.templateParameters(alert).map(
                  (text) => ({ type: 'text', text }),
                ),
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    const result = (await response.json()) as WhatsAppApiResponse;

    if (!response.ok) {
      throw new Error(
        result?.error?.message ||
          `WhatsApp API returned HTTP ${response.status}`,
      );
    }

    delivery.status = DeliveryStatus.SENT;
    delivery.sentAt = new Date();
    delivery.providerMessageId = result?.messages?.[0]?.id;

    await delivery.save();
  }

  /** Ordered body values for the approved hazard-alert template. */
  private templateParameters(alert: HazardAlertDocument): string[] {
    return [
      alert.title,
      alert.hazardType,
      alert.severity,
      alert.affectedDistricts.join(', '),
      alert.affectedCities.join(', '),
      alert.safetyInstructions,
    ];
  }

  private get apiConfig(): WhatsAppConfig {
    return {
      accessToken: this.config.get<string>('WHATSAPP_ACCESS_TOKEN'),
      phoneNumberId: this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID'),
      version: this.config.get<string>('WHATSAPP_API_VERSION'),
      templateName: this.config.get<string>('WHATSAPP_TEMPLATE_NAME'),
      language:
        this.config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE') ||
        DEFAULT_TEMPLATE_LANGUAGE,
    };
  }
}
