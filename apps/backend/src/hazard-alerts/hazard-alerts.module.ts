
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

import { HazardAlertsService } from './hazard-alerts.service';

import { HazardAlertsController } from './hazard-alerts.controller';

import { NotificationsController } from './notifications.controller';

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
    ]),
  ],
  controllers: [
    HazardAlertsController,
    NotificationsController,
  ],
  providers: [
    HazardAlertsService,
  ],
  exports: [
    HazardAlertsService,
  ],
})
export class HazardAlertsModule {}
