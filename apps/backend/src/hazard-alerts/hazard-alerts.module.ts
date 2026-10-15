
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  User,
  UserSchema,
} from '../users/schemas/user.schema';

import {
  HazardAlert,
  HazardAlertSchema,
} from './schemas/hazard-alert.schema';

import {
  NotificationDelivery,
  NotificationDeliverySchema,
} from './schemas/notification-delivery.schema';

import {
  DisasterReport,
  ReportSchema,
} from '../reports/schemas/report.schema';

import { HazardAlertsService } from './hazard-alerts.service';

import { NotificationPreferencesService } from './notification-preferences.service';

import { RecipientResolver } from './recipient.resolver';

import { HazardAlertsController } from './hazard-alerts.controller';

import { NotificationsController } from './notifications.controller';

import { NOTIFICATION_CHANNEL_SENDERS } from './channels/notification-channel.sender';

import { PushSender } from './channels/push.sender';

import { SmsSender } from './channels/sms.sender';

import { WhatsAppSender } from './channels/whatsapp.sender';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: HazardAlert.name,
        schema: HazardAlertSchema,
      },
      {
        name: NotificationDelivery.name,
        schema: NotificationDeliverySchema,
      },
      {
        name: DisasterReport.name,
        schema: ReportSchema,
      },
    ]),
  ],
  controllers: [
    HazardAlertsController,
    NotificationsController,
  ],
  providers: [
    HazardAlertsService,
    NotificationPreferencesService,
    RecipientResolver,
    PushSender,
    WhatsAppSender,
    SmsSender,
    {
      provide: NOTIFICATION_CHANNEL_SENDERS,
      useFactory: (
        push: PushSender,
        whatsapp: WhatsAppSender,
        sms: SmsSender,
      ) => [push, whatsapp, sms],
      inject: [PushSender, WhatsAppSender, SmsSender],
    },
  ],
  exports: [
    HazardAlertsService,
  ],
})
export class HazardAlertsModule {}
