
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

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
  UserRole,
} from '../users/schemas/user.schema';

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

import { CreateHazardAlertDto } from './dto/create-hazard-alert.dto';

@Injectable()
export class HazardAlertsService {
  private readonly logger =
    new Logger(HazardAlertsService.name);

  constructor(
    @InjectModel(User.name)
    private readonly users: Model<UserDocument>,

    @InjectModel(HazardAlert.name)
    private readonly alerts: Model<HazardAlertDocument>,

    @InjectModel(NotificationDelivery.name)
    private readonly deliveries: Model<NotificationDelivery>,
  ) {}

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

    const alert = await this.alerts.create({
      title: dto.title.trim(),
      message: dto.message.trim(),
      safetyInstructions: dto.safetyInstructions.trim(),
      hazardType: dto.hazardType.trim(),
      severity: dto.severity,
      affectedDistricts: districts,
      affectedCities: cities,
      publishedBy: publisherId,
      status: HazardAlertStatus.PUBLISHED,
      publishedAt: new Date(),
    });

    // Do not fail publication because a notification provider
    // is temporarily unavailable.
    const dispatch = await this.dispatch(alert);

    return {
      success: true,
      message: 'Hazard alert published',
      data: {
        alert,
        dispatch,
      },
    };
  }

  async dispatch(alert: HazardAlertDocument) {
    const recipients = await this.users
      .find({
        role: UserRole.CITIZEN,
        isActive: true,
        deletedAt: { $exists: false },
        $expr: {
          $and: [
            {
              $in: [
                {
                  $toLower: {
                    $trim: {
                      input: {
                        $ifNull: ['$district', ''],
                      },
                    },
                  },
                },
                alert.affectedDistricts.map((x) =>
                  x.toLowerCase(),
                ),
              ],
            },
            {
              $in: [
                {
                  $toLower: {
                    $trim: {
                      input: {
                        $ifNull: ['$livingCity', ''],
                      },
                    },
                  },
                },
                alert.affectedCities.map((x) =>
                  x.toLowerCase(),
                ),
              ],
            },
          ],
        },
      })
      .select(
        '_id phone fcmTokens whatsappOptIn',
      )
      .lean()
      .exec();

    let pushQueued = 0;
    let whatsappQueued = 0;
    let skipped = 0;

    for (const recipient of recipients) {
      const recipientId = String(recipient._id);

      const channels: NotificationChannel[] = [];

      if (
        Array.isArray(recipient.fcmTokens) &&
        recipient.fcmTokens.length > 0
      ) {
        channels.push(NotificationChannel.PUSH);
      }

      if (
        recipient.whatsappOptIn === true &&
        recipient.phone
      ) {
        channels.push(NotificationChannel.WHATSAPP);
      }

      if (channels.length === 0) {
        skipped++;
        continue;
      }

      for (const channel of channels) {
        // The unique index prevents duplicate deliveries when
        // a request is retried or the same alert is dispatched again.
        let delivery;

        try {
          delivery = await this.deliveries.findOneAndUpdate(
            {
              alertId: String(alert._id),
              recipientId,
              channel,
            },
            {
              $setOnInsert: {
                alertId: String(alert._id),
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
        } catch (error: any) {
          if (error?.code === 11000) {
            continue;
          }

          throw error;
        }

        // Do not send again when a previous attempt was accepted
        // or confirmed delivered by the provider.
        if (
          delivery.status === DeliveryStatus.SENT ||
          delivery.status === DeliveryStatus.DELIVERED
        ) {
          continue;
        }

        if (channel === NotificationChannel.PUSH) {
          await this.sendPush(
            alert,
            recipient.fcmTokens || [],
            delivery,
          );

          pushQueued++;
        } else {
          await this.sendWhatsApp(
            alert,
            recipient.phone!,
            delivery,
          );

          whatsappQueued++;
        }
      }
    }

    return {
      matchedCitizens: recipients.length,
      pushAttempts: pushQueued,
      whatsappAttempts: whatsappQueued,
      skippedWithoutEnabledChannel: skipped,
    };
  }

  private async sendPush(
    alert: HazardAlertDocument,
    tokens: string[],
    delivery: any,
  ) {
    try {
      if (!process.env.FIREBASE_PROJECT_ID) {
        throw new Error(
          'FIREBASE_PROJECT_ID is not configured',
        );
      }

      if (getApps().length === 0) {
        initializeApp({
          credential: applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID,
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

      const successful = result.responses
        .filter((response) => response.success)
        .length;

      if (successful > 0) {
        delivery.status = DeliveryStatus.SENT;
        delivery.sentAt = new Date();
      } else {
        delivery.status = DeliveryStatus.FAILED;
        delivery.failureReason =
          'Firebase rejected all registered device tokens';
      }

      await delivery.save();

      // Remove tokens known to be permanently invalid.
      const invalidTokens = result.responses
        .map((response, index) => ({
          response,
          token: tokens[index],
        }))
        .filter(({ response }) => {
          const code = response.error?.code;

          return (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          );
        })
        .map(({ token }) => token);

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
    } catch (error: any) {
      delivery.status = DeliveryStatus.FAILED;
      delivery.failureReason = this.safeError(error);
      await delivery.save();

      this.logger.warn(
        `Push delivery failed for alert ${alert._id}`,
      );
    }
  }

  private async sendWhatsApp(
    alert: HazardAlertDocument,
    phone: string,
    delivery: any,
  ) {
    try {
      const accessToken =
        process.env.WHATSAPP_ACCESS_TOKEN;

      const phoneNumberId =
        process.env.WHATSAPP_PHONE_NUMBER_ID;

      const version =
        process.env.WHATSAPP_API_VERSION;

      const templateName =
        process.env.WHATSAPP_TEMPLATE_NAME;

      const language =
        process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

      if (
        !accessToken ||
        !phoneNumberId ||
        !version ||
        !templateName
      ) {
        throw new Error(
          'WhatsApp Cloud API configuration is incomplete',
        );
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
            to: this.normalizePhone(phone),
            type: 'template',
            template: {
              name: templateName,
              language: {
                code: language,
              },
              components: [
                {
                  type: 'body',
                  parameters: [
                    {
                      type: 'text',
                      text: alert.title,
                    },
                    {
                      type: 'text',
                      text: alert.hazardType,
                    },
                    {
                      type: 'text',
                      text: alert.severity,
                    },
                    {
                      type: 'text',
                      text: alert.affectedDistricts.join(', '),
                    },
                    {
                      type: 'text',
                      text: alert.affectedCities.join(', '),
                    },
                    {
                      type: 'text',
                      text: alert.safetyInstructions,
                    },
                  ],
                },
              ],
            },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );

      const result = await response.json() as any;

      if (!response.ok) {
        throw new Error(
          result?.error?.message ||
            `WhatsApp API returned HTTP ${response.status}`,
        );
      }

      delivery.status = DeliveryStatus.SENT;
      delivery.sentAt = new Date();
      delivery.providerMessageId =
        result?.messages?.[0]?.id;

      await delivery.save();
    } catch (error: any) {
      delivery.status = DeliveryStatus.FAILED;
      delivery.failureReason = this.safeError(error);

      await delivery.save();

      this.logger.warn(
        `WhatsApp delivery failed for alert ${alert._id}`,
      );
    }
  }

  async registerDevice(
    userId: string,
    token: string,
  ) {
    const cleanToken = token.trim();

    if (!cleanToken) {
      throw new BadRequestException(
        'Device token is required',
      );
    }

    const user = await this.users.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          fcmTokens: cleanToken,
        },
      },
      {
        new: true,
      },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Device registered successfully',
    };
  }

  async unregisterDevice(
    userId: string,
    token: string,
  ) {
    const user = await this.users.findByIdAndUpdate(
      userId,
      {
        $pull: {
          fcmTokens: token.trim(),
        },
      },
      {
        new: true,
      },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Device unregistered successfully',
    };
  }

  async updateWhatsappConsent(
    userId: string,
    optIn: boolean,
  ) {
    const user = await this.users.findByIdAndUpdate(
      userId,
      {
        $set: {
          whatsappOptIn: optIn,
          whatsappOptInAt: optIn
            ? new Date()
            : undefined,
        },
      },
      {
        new: true,
      },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      whatsappOptIn: user.whatsappOptIn,
    };
  }

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

  private normalizeAreas(values: string[]) {
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

  private normalizePhone(phone: string) {
    // Store WhatsApp numbers in international format,
    // digits only, without a leading "+".
    const normalized = phone.replace(/[\s()+.-]/g, '');

    if (!/^\d{8,15}$/.test(normalized)) {
      throw new BadRequestException(
        'Recipient phone number must be in international format',
      );
    }

    return normalized;
  }

  private safeError(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown provider error';

    // Do not store access tokens or authorization headers.
    return message.slice(0, 500);
  }
}
