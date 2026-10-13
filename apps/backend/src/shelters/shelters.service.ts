
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Shelter,
  ShelterDocument,
  ShelterOperationalStatus,
} from './schemas/shelter.schema';

import { CreateShelterDto } from './dto/create-shelter.dto';
import { UpdateShelterDto } from './dto/update-shelter.dto';

import { UserRole } from '../users/schemas/user.schema';

// Contains the authenticated user's permissions loaded from MongoDB.
interface AuthenticatedUser {
  _id?: string;
  id?: string;
  role: UserRole;
  district?: string;
  assignedDistricts?: string[];
  assignedShelterIds?: (string | Types.ObjectId)[];
}

@Injectable()
export class SheltersService {
  constructor(
    @InjectModel(Shelter.name)
    private readonly shelterModel: Model<Shelter>,
  ) {}

  // Check for globally privileged roles.
  private isAdmin(user: AuthenticatedUser): boolean {
    return (
      user.role === UserRole.SYSTEM_ADMIN ||
      user.role === UserRole.ADMIN
    );
  }

  // Check whether the user can manage the shelter registry.
  private canManageShelters(user: AuthenticatedUser): boolean {
    return (
      this.isAdmin(user) ||
      user.role === UserRole.DUTY_OFFICER
    );
  }

  // Check district permissions for officers.
  // REVIEW [Inconsistency]: DUTY_OFFICER is district-scoped here but global in relief supplies - define one shared access policy.
  private canAccessDistrict(
    user: AuthenticatedUser,
    district: string,
  ): boolean {
    if (this.isAdmin(user)) {
      return true;
    }

    if (
      user.role !== UserRole.DUTY_OFFICER &&
      user.role !== UserRole.DISTRICT_OFFICER
    ) {
      return false;
    }

    const districts = [
      ...(user.assignedDistricts ?? []),
      ...(user.district ? [user.district] : []),
    ].map((value) => value.trim().toLowerCase());

    return districts.includes(district.trim().toLowerCase());
  }

  // Check whether the user can view a particular shelter.
  // Shelter Staff can only view shelters assigned to their account.
  private canAccessShelter(
    user: AuthenticatedUser,
    shelter: ShelterDocument,
  ): boolean {
    if (this.isAdmin(user)) {
      return true;
    }

    if (
      user.role === UserRole.DUTY_OFFICER ||
      user.role === UserRole.DISTRICT_OFFICER
    ) {
      return this.canAccessDistrict(user, shelter.district);
    }

    if (user.role === UserRole.SHELTER_STAFF) {
      const assignedIds = (
        user.assignedShelterIds ?? []
      ).map((value) => value.toString());

      return assignedIds.includes(shelter._id.toString());
    }

    return false;
  }

  // Register a new shelter.
  async create(
    dto: CreateShelterDto,
    user: AuthenticatedUser,
  ): Promise<ShelterDocument> {
    if (!this.canManageShelters(user)) {
      throw new ForbiddenException(
        'You are not authorized to register shelters.',
      );
    }

    if (!this.canAccessDistrict(user, dto.district)) {
      throw new ForbiddenException(
        'You cannot manage shelters in this district.',
      );
    }

    const shelterCode = dto.shelterCode.trim().toUpperCase();

    const existing = await this.shelterModel.findOne({
      shelterCode,
    });

    if (existing) {
      throw new ConflictException(
        'A shelter with this code already exists.',
      );
    }

    return this.shelterModel.create({
      ...dto,
      shelterCode,
    });
  }

  // List shelters with optional filters.
  // REVIEW [SRP]: filter building and role scoping are mixed in one method - extract buildScopeFilter(user).
  async findAll(
    user: AuthenticatedUser,
    filters: {
      city?: string;
      district?: string;
      isActive?: string;
      operationalStatus?: ShelterOperationalStatus;
    },
  ): Promise<ShelterDocument[]> {
    const query: Record<string, unknown> = {};

    if (filters.city) {
      query.city = new RegExp(
        `^${this.escapeRegex(filters.city.trim())}$`,
        'i',
      );
    }

    if (filters.district) {
      query.district = new RegExp(
        `^${this.escapeRegex(filters.district.trim())}$`,
        'i',
      );
    }

    if (filters.isActive !== undefined) {
      if (!['true', 'false'].includes(filters.isActive)) {
        throw new BadRequestException(
          'isActive must be true or false.',
        );
      }

      query.isActive = filters.isActive === 'true';
    }

    if (filters.operationalStatus) {
      query.operationalStatus = filters.operationalStatus;
    }

    // Limit officers to their assigned districts.
    if (
      user.role === UserRole.DUTY_OFFICER ||
      user.role === UserRole.DISTRICT_OFFICER
    ) {
      const districts = [
        ...(user.assignedDistricts ?? []),
        ...(user.district ? [user.district] : []),
      ].map((value) => value.trim());

      // Prevent a requested district from bypassing assigned scope.
      if (
        filters.district &&
        !districts.some(
          (value) =>
            value.toLowerCase() ===
            filters.district!.trim().toLowerCase(),
        )
      ) {
        throw new ForbiddenException(
          'You cannot access shelters in this district.',
        );
      }

      // REVIEW [Bug]: this overwrites the district filter set above, so an officer filtering by one of their districts still gets all of them.
      query.district = {
        $in: districts.length ? districts : ['__NO_ACCESS__'],
      };
    } else if (user.role === UserRole.SHELTER_STAFF) {
      // Shelter Staff can view only their assigned shelters.
      const ids = (user.assignedShelterIds ?? [])
        .filter((value) =>
          Types.ObjectId.isValid(value.toString()),
        )
        .map((value) => new Types.ObjectId(value.toString()));

      query._id = { $in: ids };
    } else if (!this.isAdmin(user)) {
      throw new ForbiddenException(
        'You are not authorized to view shelter records.',
      );
    }

    return this.shelterModel
      .find(query)
      .sort({ district: 1, city: 1, name: 1 })
      .exec();
  }

  // Retrieve a shelter after checking the user's access.
  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<ShelterDocument> {
    const shelter = await this.getShelter(id);

    if (!this.canAccessShelter(user, shelter)) {
      throw new ForbiddenException(
        'You are not authorized to access this shelter.',
      );
    }

    return shelter;
  }

  // Update shelter registry information.
  async update(
    id: string,
    dto: UpdateShelterDto,
    user: AuthenticatedUser,
  ): Promise<ShelterDocument> {
    if (!this.canManageShelters(user)) {
      throw new ForbiddenException(
        'You are not authorized to update shelters.',
      );
    }

    const shelter = await this.getShelter(id);
    const targetDistrict = dto.district ?? shelter.district;

    // Check permission for both the current and destination districts.
    if (
      !this.canAccessDistrict(user, shelter.district) ||
      !this.canAccessDistrict(user, targetDistrict)
    ) {
      throw new ForbiddenException(
        'You cannot manage shelters in this district.',
      );
    }

    if (dto.shelterCode) {
      const normalizedCode = dto.shelterCode.trim().toUpperCase();

      if (normalizedCode !== shelter.shelterCode) {
        const duplicate = await this.shelterModel.findOne({
          shelterCode: normalizedCode,
          _id: { $ne: shelter._id },
        });

        if (duplicate) {
          throw new ConflictException(
            'A shelter with this code already exists.',
          );
        }
      }

      dto.shelterCode = normalizedCode;
    }

    // Safe only because the global ValidationPipe whitelist strips fields such as isActive from the DTO.
    Object.assign(shelter, dto);
    return shelter.save();
  }

  // Activate or deactivate a shelter without deleting its record.
  async setActive(
    id: string,
    isActive: boolean,
    user: AuthenticatedUser,
  ): Promise<ShelterDocument> {
    if (!this.canManageShelters(user)) {
      throw new ForbiddenException(
        'You are not authorized to change shelter status.',
      );
    }

    const shelter = await this.getShelter(id);

    if (!this.canAccessDistrict(user, shelter.district)) {
      throw new ForbiddenException(
        'You cannot manage shelters in this district.',
      );
    }

    shelter.isActive = isActive;
    return shelter.save();
  }

  // Validate the ID and retrieve the shelter.
  private async getShelter(
    id: string,
  ): Promise<ShelterDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid shelter ID.');
    }

    const shelter = await this.shelterModel.findById(id).exec();

    if (!shelter) {
      throw new NotFoundException('Shelter not found.');
    }

    return shelter;
  }

  // Escape special characters in user-supplied search filters.
  // REVIEW [DRY]: same regex is inlined in ReliefSuppliesService and ReliefSupplyRequestsService - share one util.
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
