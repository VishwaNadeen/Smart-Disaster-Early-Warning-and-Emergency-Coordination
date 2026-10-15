import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  applicationDefault,
  getApps,
  initializeApp,
} from 'firebase-admin/app';

import { getMessaging } from 'firebase-admin/messaging';

import {
  User,
  UserDocument,
} from '../../users/schemas/user.schema';

import { HazardAlertDocument } from '../schemas/hazard-alert.schema';

import {
  DeliveryStatus,
  NotificationChannel,
} from '../schemas/notification-delivery.schema';

import { BaseChannelSender } from './base-channel.sender';

import {
  AlertRecipient,
  DeliveryRecord,
} from './notification-channel.sender';

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/**
 * Sends hazard alerts as Firebase Cloud Messaging push notifications to
 * every device token registered by the citizen, and prunes tokens that
 * Firebase reports as permanently invalid.
 */
@Injectable()
export class PushSender extends BaseChannelSender {
  readonly channel = NotificationChannel.PUSH;

  protected readonly label = 'Push';

  constructor(
    @InjectModel(User.name)
    private readonly users: Model<UserDocument>,
    private readonly config: ConfigService,
  ) {
    super();
  }

  /** A recipient is reachable when at least one device token is registered. */
  canReach(recipient: AlertRecipient): boolean {
    return (
      Array.isArray(recipient.fcmTokens) &&
      recipient.fcmTokens.length > 0
    );
  }

  protected async deliver(
    alert: HazardAlertDocument,
    recipient: AlertRecipient,
    delivery: DeliveryRecord,
  ): Promise<void> {
    const tokens = recipient.fcmTokens ?? [];
    const projectId = this.firebaseProjectId;

    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID is not configured');
    }

    if (getApps().length === 0) {
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    }

    const result = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `[${alert.severity}] ${alert.title}`,
        body: alert.message,
      },
      data: {
        alertId: String(alert._id),
        hazardType: alert.hazardType,
        severity: alert.severity,
        affectedDistricts: alert.affectedDistricts.join(','),
        affectedCities: alert.affectedCities.join(','),
        safetyInstructions: alert.safetyInstructions,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'hazard_alerts',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    });

    const accepted = result.responses.some(
      (response) => response.success,
    );

    if (accepted) {
      delivery.status = DeliveryStatus.SENT;
      delivery.sentAt = new Date();
    } else {
      delivery.status = DeliveryStatus.FAILED;
      delivery.failureReason =
        'Firebase rejected all registered device tokens';
    }

    await delivery.save();

    const invalidTokens = tokens.filter((_, index) =>
      INVALID_TOKEN_ERROR_CODES.has(
        result.responses[index]?.error?.code ?? '',
      ),
    );

    if (invalidTokens.length > 0) {
      await this.users.updateMany(
        {},
        {
          $pull: {
            fcmTokens: { $in: invalidTokens },
          },
        },
      );
    }
  }

  private get firebaseProjectId(): string | undefined {
    return this.config.get<string>('FIREBASE_PROJECT_ID');
  }
}
