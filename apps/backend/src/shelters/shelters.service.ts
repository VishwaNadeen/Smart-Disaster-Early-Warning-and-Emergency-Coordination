
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

import { OccupancyHistory } from './schemas/occupancy-history.schema';

import { CreateShelterDto } from './dto/create-shelter.dto';
import { UpdateShelterDto } from './dto/update-shelter.dto';

import {
  OccupancyUpdateDto,
  OccupancyUpdateType,
} from './dto/occupancy-update.dto';

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

    // Store occupancy changes in the audit-history collection.
    @InjectModel(OccupancyHistory.name)
    private readonly occupancyHistoryModel: Model<OccupancyHistory>,
  ) {}

  // Get the authenticated user's database ID.
  private getUserId(user: AuthenticatedUser): string {
    const id = user._id ?? user.id;

    if (!id || !Types.ObjectId.isValid(id)) {
      throw new ForbiddenException(
        'A valid authenticated user ID is required.',
      );
    }

    return id;
  }

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

  // Check whether the user can update a shelter's occupancy.
  private canUpdateOccupancy(
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

      query.district = {
        $in: districts.length ? districts : ['__NO_ACCESS__'],
      };
    } else if (user.role === UserRole.SHELTER_STAFF) {
      // Shelter staff can view only their assigned shelters.
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

    if (
      !this.isAdmin(user) &&
      !this.canAccessDistrict(user, shelter.district) &&
      !this.canUpdateOccupancy(user, shelter)
    ) {
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

  // Update occupancy and create an audit record.
  async updateOccupancy(
    id: string,
    dto: OccupancyUpdateDto,
    user: AuthenticatedUser,
  ): Promise<ShelterDocument> {
    const shelter = await this.getShelter(id);

    if (!this.canUpdateOccupancy(user, shelter)) {
      throw new ForbiddenException(
        'Only assigned shelter staff and authorized officers can update occupancy.',
      );
    }

    if (!shelter.isActive) {
      throw new BadRequestException(
        'An inactive shelter cannot receive occupancy updates.',
      );
    }

    if (
      !Number.isInteger(dto.count) ||
      dto.count < 0
    ) {
      throw new BadRequestException(
        'Count must be a non-negative integer.',
      );
    }

    const previousOccupancy = shelter.currentOccupancy;
    let nextOccupancy = previousOccupancy;

    switch (dto.type) {
      case OccupancyUpdateType.ARRIVAL:
        if (dto.count <= 0) {
          throw new BadRequestException(
            'Arrival count must be greater than zero.',
          );
        }

        nextOccupancy += dto.count;
        break;

      case OccupancyUpdateType.DEPARTURE:
        if (dto.count <= 0) {
          throw new BadRequestException(
            'Departure count must be greater than zero.',
          );
        }

        if (dto.count > previousOccupancy) {
          throw new BadRequestException(
            'Departure count cannot exceed current occupancy.',
          );
        }

        nextOccupancy -= dto.count;
        break;

      case OccupancyUpdateType.VERIFIED_COUNT:
        // A verified count replaces the current total.
        nextOccupancy = dto.count;
        break;

      default:
        throw new BadRequestException(
          'Unsupported occupancy update type.',
        );
    }

    // Do not block emergency arrivals when capacity is exceeded.
    shelter.currentOccupancy = nextOccupancy;
    shelter.lastOccupancyVerifiedAt = new Date();

    // Save the updated shelter first.
    const updatedShelter = await shelter.save();

    // Record the actor and before/after occupancy values.
    await this.occupancyHistoryModel.create({
      shelterId: shelter._id,
      changedBy: new Types.ObjectId(this.getUserId(user)),
      changeType: dto.type,
      previousOccupancy,
      newOccupancy: nextOccupancy,
      notes: dto.notes,
    });

    return updatedShelter;
  }

  // Retrieve the latest 100 occupancy history records for a shelter.
  async getOccupancyHistory(
    id: string,
    user: AuthenticatedUser,
  ): Promise<OccupancyHistory[]> {
    // Verify the user is authorized to access this shelter.
    await this.findOne(id, user);

    return this.occupancyHistoryModel
      .find({
        shelterId: new Types.ObjectId(id),
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
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
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
