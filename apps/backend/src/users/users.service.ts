
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
  UserRole,
} from './schemas/user.schema';

import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getProfile(
    userId: string,
  ): Promise<{
    success: boolean;
    data: Record<string, unknown>;
  }> {
    const user = await this.userModel
      .findById(userId)
      .select('-passwordHash')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: Record<string, unknown> = {
      ...user,
    };

    if (user.role === UserRole.DUTY_OFFICER) {
      delete data.address;
      delete data.district;
      delete data.livingCity;
      delete data.fcmTokens;
      delete data.whatsappOptIn;
      delete data.whatsappOptInAt;
    }

    return {
      success: true,
      data,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ) {
    const existingUser = await this.userModel
      .findById(userId)
      .select('role')
      .lean()
      .exec();

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.role !== UserRole.CITIZEN &&
        existingUser.role !== UserRole.VOLUNTEER) {
      throw new BadRequestException(
        'This endpoint is only for citizen and volunteer profiles.',
      );
    }

    const update: Record<string, unknown> = {};

    if (dto.fullName !== undefined) {
      update.fullName = dto.fullName.trim();
    }

    if (dto.phone !== undefined) {
      update.phone = dto.phone.trim();
    }

    if (dto.district !== undefined) {
      update.district = dto.district.trim();
    }

    if (dto.livingCity !== undefined) {
      update.livingCity = dto.livingCity.trim();
    }

    if (dto.address !== undefined) {
      update.address = dto.address.trim();
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: update },
        {
          new: true,
          runValidators: true,
        },
      )
      .select('-passwordHash')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      data: user,
    };
  }

  async deleteAccount(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    user.deletedAt = new Date();

    // Prevent further notifications to deactivated accounts.
    user.fcmTokens = [];
    user.whatsappOptIn = false;

    await user.save();

    return {
      success: true,
      message: 'Account deactivated successfully',
    };
  }
}
