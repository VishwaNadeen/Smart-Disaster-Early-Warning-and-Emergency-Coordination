
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ProfileCompleteGuard implements CanActivate {
  constructor(
    @InjectModel('User')
    private readonly users: Model<any>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userRole = req.user?.role;

    // This guard is intended for Duty Officer operational endpoints.
    if (userRole !== 'DUTY_OFFICER') {
      throw new ForbiddenException(
        'Only Duty Officers can access this operation',
      );
    }

    const userId = req.user?.id ?? req.user?._id;

    if (!userId) {
      throw new ForbiddenException('Invalid authenticated user');
    }

    const user: any = await this.users
      .findById(userId)
      .select(
        'fullName email emailVerified isActive officerIdNumber dmcNumber workingLocation officePhoneNumber residentialAddress officeAddress assignedDistricts',
      )
      .lean()
      .exec();

    if (!user || !user.isActive) {
      throw new ForbiddenException('Officer account is inactive');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Verify your email before using officer functions',
      );
    }

    const requiredFields = [
      user.fullName,
      user.email,
      user.officerIdNumber,
      user.dmcNumber,
      user.workingLocation,
      user.officePhoneNumber,
      user.residentialAddress,
      user.officeAddress,
    ];

    const fieldsComplete = requiredFields.every(
      (value) => typeof value === 'string' && value.trim().length > 0,
    );

    const districtsAssigned =
      Array.isArray(user.assignedDistricts) &&
      user.assignedDistricts.length > 0;

    if (!fieldsComplete || !districtsAssigned) {
      throw new ForbiddenException({
        code: 'OFFICER_PROFILE_INCOMPLETE',
        message:
          'Complete all required profile fields before using officer functions.',
        profileEndpoint: '/api/officer/me/profile',
      });
    }

    return true;
  }
}
