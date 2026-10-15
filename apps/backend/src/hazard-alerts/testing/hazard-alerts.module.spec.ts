import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { HazardAlertsModule } from '../hazard-alerts.module';

import { HazardAlertsService } from '../hazard-alerts.service';

import { NotificationPreferencesService } from '../notification-preferences.service';

import { RecipientResolver } from '../recipient.resolver';

import { NOTIFICATION_CHANNEL_SENDERS } from '../channels/notification-channel.sender';

import { PushSender } from '../channels/push.sender';

import { SmsSender } from '../channels/sms.sender';

import { WhatsAppSender } from '../channels/whatsapp.sender';

import { NotificationChannel } from '../schemas/notification-delivery.schema';

describe('HazardAlertsModule', () => {
  const providers: unknown[] = Reflect.getMetadata('providers', HazardAlertsModule);

  it('registers the alert use-case services and the three channel senders', () => {
    expect(providers).toEqual(
      expect.arrayContaining([
        HazardAlertsService,
        NotificationPreferencesService,
        RecipientResolver,
        PushSender,
        WhatsAppSender,
        SmsSender,
      ]),
    );
  });

  it('provides every channel sender under the NOTIFICATION_CHANNEL_SENDERS token', () => {
    const provider = providers.find(
      (candidate) =>
        typeof candidate === 'object' &&
        candidate !== null &&
        (candidate as { provide?: unknown }).provide === NOTIFICATION_CHANNEL_SENDERS,
    ) as {
      useFactory: (...senders: unknown[]) => { channel: NotificationChannel }[];
      inject: unknown[];
    };

    expect(provider.inject).toEqual([PushSender, WhatsAppSender, SmsSender]);

    const push = { channel: NotificationChannel.PUSH };
    const whatsapp = { channel: NotificationChannel.WHATSAPP };
    const sms = { channel: NotificationChannel.SMS };

    expect(provider.useFactory(push, whatsapp, sms)).toEqual([push, whatsapp, sms]);
  });

  it('exports the hazard alerts service for other modules', () => {
    expect(Reflect.getMetadata('exports', HazardAlertsModule)).toEqual([HazardAlertsService]);
  });
});
