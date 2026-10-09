import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  User,
  UserDocument,
} from './schemas/user.schema';

import {
  UpdateProfileDto,
} from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel:
      Model<UserDocument>,
  ) {}

  async getProfile(
    userId: string,
  ) {
    const user =
      await this.userModel
        .findById(userId)
        .select(
          '-passwordHash',
        )
        .lean();

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    return {
      success: true,
      data: user,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ) {
    const user =
      await this.userModel
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
        .select(
          '-passwordHash',
        )
        .lean();

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    return {
      success: true,

      message:
        'Profile updated successfully',

      data: user,
    };
  }

  async deleteAccount(
    userId: string,
  ) {
    const user =
      await this.userModel.findById(
        userId,
      );

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    user.isActive = false;

    user.deletedAt =
      new Date();

    await user.save();

    return {
      success: true,

      message:
        'Account deactivated successfully',
    };
  }
}