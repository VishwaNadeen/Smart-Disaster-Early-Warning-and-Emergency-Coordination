
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import {
  User,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';

import {
  Shelter,
  ShelterDocument,
} from './schemas/shelter.schema';

import { CreateShelterStaffDto } from './dto/create-shelter-staff.dto';

interface ShelterStaffActor {
  id: string;
  role: UserRole;
  district?: string;
  assignedDistricts?: string[];
}

@Injectable()
export class ShelterStaffService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Shelter.name)
    private readonly shelterModel: Model<ShelterDocument>,
  ) {}

  async createForShelter(
    shelterId: string,
    dto: CreateShelterStaffDto,
    actor: ShelterStaffActor,
  ) {
    const allowedRoles = [
      UserRole.DUTY_OFFICER,
      UserRole.DISTRICT_OFFICER,
      UserRole.ADMIN,
      UserRole.SYSTEM_ADMIN,
    ];

    if (!allowedRoles.includes(actor.role)) {
      throw new ForbiddenException(
        'You are not allowed to create Shelter Staff accounts.',
      );
    }

    if (!Types.ObjectId.isValid(shelterId)) {
      throw new NotFoundException('Invalid shelter ID.');
    }

    const shelter = await this.shelterModel
      .findById(shelterId)
      .exec();

    if (!shelter || !shelter.isActive) {
      throw new NotFoundException(
        'The shelter does not exist or is inactive.',
      );
    }

    if (
      actor.role === UserRole.DUTY_OFFICER ||
      actor.role === UserRole.DISTRICT_OFFICER
    ) {
      const allowedDistricts = [
        ...(actor.district ? [actor.district] : []),
        ...(actor.assignedDistricts ?? []),
      ].map((district) => district.trim().toLowerCase());

      if (
        !allowedDistricts.includes(
          shelter.district.trim().toLowerCase(),
        )
      ) {
        throw new ForbiddenException(
          'You do not have permission to manage staff for this shelter.',
        );
      }
    }

    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.userModel
      .findOne({ email })
      .exec();

    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const staff = await this.userModel.create({
      fullName: dto.fullName.trim(),
      email,
      passwordHash,
      phone: dto.phone?.trim(),
      role: UserRole.SHELTER_STAFF,
      district: shelter.district,
      assignedShelterIds: [shelter._id],
      isActive: true,
      emailVerified: true,
      mustCompleteProfile: true,
    });

    return {
      success: true,
      message: 'Shelter Staff account created successfully.',
      data: {
        id: staff.id,
        fullName: staff.fullName,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        district: staff.district,
        assignedShelterIds: staff.assignedShelterIds,
        isActive: staff.isActive,
        shelter: {
          id: shelter.id,
          name: shelter.name,
          shelterCode: shelter.shelterCode,
        },
      },
    };
  }
}
