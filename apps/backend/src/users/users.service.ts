
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

    // Convert the Mongoose result into a plain object
    // so TypeScript does not infer a deeply nested Mongoose type.
    const userData: Record<string, unknown> = {
      ...user,
    };

    // Keep generic citizen fields separate from
    // the DMC Officer's own profile information.
    if (user.role === UserRole.DUTY_OFFICER) {
      delete userData.address;
      delete userData.district;
    }

    return {
      success: true,
      data: userData,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ) {
    const existingUser = await this.userModel
      .findById(userId)
      .select('role')
      .lean();

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Duty Officers must use /api/officer/me/profile.
    // Their residential address and working districts
    // must not be managed through the generic endpoint.
    if (existingUser.role === UserRole.DUTY_OFFICER) {
      throw new BadRequestException(
        'Duty Officer profiles must be updated through ' +
          '/api/officer/me/profile. Personal address and ' +
          'assigned working districts are separate.',
      );
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            ...dto,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .select('-passwordHash')
      .lean();

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

    await user.save();

    return {
      success: true,
      message: 'Account deactivated successfully',
    };
  }
}
