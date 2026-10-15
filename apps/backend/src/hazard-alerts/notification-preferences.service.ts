import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  User,
  UserDocument,
} from '../users/schemas/user.schema';

/**
 * Manages a citizen's notification preferences: the Firebase device tokens
 * that receive push alerts and the WhatsApp consent flag.
 */
@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectModel(User.name)
    private readonly users: Model<UserDocument>,
  ) {}

  /**
   * Registers a push-notification device token for a user. Registering the
   * same token twice has no effect.
   *
   * @param userId The authenticated user.
   * @param token The Firebase device token (surrounding spaces are ignored).
   * @throws BadRequestException when the token is blank.
   * @throws NotFoundException when the user does not exist.
   */
  async registerDevice(userId: string, token: string) {
    const cleanToken = token.trim();

    if (!cleanToken) {
      throw new BadRequestException('Device token is required');
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

  /**
   * Removes a device token so the device stops receiving push alerts.
   *
   * @param userId The authenticated user.
   * @param token The Firebase device token to remove.
   * @throws NotFoundException when the user does not exist.
   */
  async unregisterDevice(userId: string, token: string) {
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

  /**
   * Records or withdraws consent to receive WhatsApp alerts. The consent
   * timestamp is stored on opt-in and cleared on opt-out.
   *
   * @param userId The authenticated user.
   * @param optIn True to consent, false to withdraw consent.
   * @throws NotFoundException when the user does not exist.
   */
  async updateWhatsappConsent(userId: string, optIn: boolean) {
    const user = await this.users.findByIdAndUpdate(
      userId,
      {
        $set: {
          whatsappOptIn: optIn,
          whatsappOptInAt: optIn ? new Date() : undefined,
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
}
