import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  User,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';

import { HazardAlertDocument } from './schemas/hazard-alert.schema';

import { AlertRecipient } from './channels/notification-channel.sender';

const ALL_CITIES = 'all cities';

/**
 * Finds the citizens who are inside the area affected by a hazard alert.
 */
@Injectable()
export class RecipientResolver {
  constructor(
    @InjectModel(User.name)
    private readonly users: Model<UserDocument>,
  ) {}

  /**
   * Returns every active, non-deleted citizen whose district is affected by
   * the alert. When specific cities are named, citizens living in one of
   * them match, and so do citizens with no recorded city (they are still
   * inside the affected district, so they are notified rather than missed).
   * An "All Cities" entry targets the whole district.
   *
   * @param alert The alert whose affected districts and cities are matched.
   * @returns The matching recipients with their contact details.
   */
  async findCitizensForAlert(
    alert: HazardAlertDocument,
  ): Promise<AlertRecipient[]> {
    return this.users
      .find({
        role: UserRole.CITIZEN,
        isActive: true,
        deletedAt: { $exists: false },
        $expr: {
          $and: this.buildLocationConditions(alert),
        },
      })
      .select('_id phone fcmTokens whatsappOptIn')
      .lean()
      .exec();
  }

  private buildLocationConditions(
    alert: HazardAlertDocument,
  ): Record<string, unknown>[] {
    const conditions: Record<string, unknown>[] = [
      {
        $in: [
          this.normalizedField('$district'),
          alert.affectedDistricts.map((district) =>
            district.toLowerCase(),
          ),
        ],
      },
    ];

    const targetAllCities = alert.affectedCities.some(
      (city) => city.trim().toLowerCase() === ALL_CITIES,
    );

    if (!targetAllCities) {
      const normalizedCity = this.normalizedField('$livingCity');

      conditions.push({
        $or: [
          { $eq: [normalizedCity, ''] },
          {
            $in: [
              normalizedCity,
              alert.affectedCities.map((city) => city.toLowerCase()),
            ],
          },
        ],
      });
    }

    return conditions;
  }

  /** Mongo expression that trims and lower-cases a (possibly missing) field. */
  private normalizedField(field: string): Record<string, unknown> {
    return {
      $toLower: {
        $trim: {
          input: {
            $ifNull: [field, ''],
          },
        },
      },
    };
  }
}
