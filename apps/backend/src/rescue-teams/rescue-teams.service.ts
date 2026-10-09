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
  RescueTeam,
  RescueTeamDocument,
  RescueTeamStatus,
  RescueTeamType,
} from './schemas/rescue-team.schema';
import {
  User,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';
import { CreateRescueTeamDto } from './dto/create-rescue-team.dto';
import { UpdateRescueTeamDto } from './dto/update-rescue-team.dto';

@Injectable()
export class RescueTeamsService {
  constructor(
    @InjectModel(RescueTeam.name)
    private readonly teamModel: Model<RescueTeamDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private isDmcOfficer(role: UserRole): boolean {
    return (
      role === UserRole.DUTY_OFFICER ||
      role === UserRole.DISTRICT_OFFICER ||
      role === UserRole.SYSTEM_ADMIN ||
      role === UserRole.ADMIN
    );
  }

  private async assertOfficer(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.isActive) {
      throw new ForbiddenException('User is not authorized or is inactive.');
    }

    if (!this.isDmcOfficer(user.role)) {
      throw new ForbiddenException(
        'Only Disaster Management Centre (DMC) officers can manage rescue teams.',
      );
    }

    return user;
  }

  private escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async generateTeamId(type: RescueTeamType): Promise<string> {
    const year = new Date().getFullYear();
    const typePrefixes: Record<RescueTeamType, string> = {
      [RescueTeamType.ARMY]: 'ARM',
      [RescueTeamType.NAVY]: 'NAV',
      [RescueTeamType.AIR_FORCE]: 'AIR',
      [RescueTeamType.POLICE]: 'POL',
      [RescueTeamType.FIRE_RESCUE]: 'FIR',
      [RescueTeamType.COAST_GUARD]: 'CST',
      [RescueTeamType.MEDICAL_EMT]: 'MED',
      [RescueTeamType.DISASTER_RELIEF]: 'REL',
      [RescueTeamType.OTHER]: 'OTH',
    };

    const prefix = typePrefixes[type] || 'RES';
    const count = await this.teamModel.countDocuments({
      teamType: type,
    });
    const random = Math.floor(100 + Math.random() * 900);
    return `RT-${prefix}-${year}-${String(count + 1).padStart(2, '0')}${random}`;
  }

  async create(
    userId: string,
    dto: CreateRescueTeamDto,
  ): Promise<{ success: boolean; message: string; data: RescueTeam }> {
    const officer = await this.assertOfficer(userId);

    let finalTeamId = dto.teamId?.trim();
    if (finalTeamId) {
      const existing = await this.teamModel.findOne({
        teamId: new RegExp(`^${this.escapeRegex(finalTeamId)}$`, 'i'),
        deletedAt: { $exists: false },
      });
      if (existing) {
        throw new ConflictException(
          `Rescue Team with ID "${finalTeamId}" already exists.`,
        );
      }
    } else {
      finalTeamId = await this.generateTeamId(dto.teamType);
    }

    const newTeam = new this.teamModel({
      ...dto,
      teamId: finalTeamId,
      createdBy: officer._id,
      createdByName: officer.fullName,
      status: dto.status || RescueTeamStatus.AVAILABLE,
      specialization: Array.isArray(dto.specialization) ? dto.specialization : [],
    });

    const saved = await newTeam.save();

    return {
      success: true,
      message: 'Rescue team registered successfully.',
      data: saved,
    };
  }

  async findAll(filters: {
    district?: string;
    teamType?: string;
    status?: string;
    search?: string;
  }): Promise<{ success: boolean; count: number; data: RescueTeam[] }> {
    const andConditions: any[] = [{ deletedAt: { $exists: false } }];

    if (
      filters.district &&
      filters.district.trim() &&
      filters.district.trim().toUpperCase() !== 'ALL'
    ) {
      const dRegex = new RegExp(
        `^${this.escapeRegex(filters.district.trim())}$`,
        'i',
      );
      andConditions.push({ district: dRegex });
    }

    if (
      filters.teamType &&
      filters.teamType.trim() &&
      filters.teamType.trim().toUpperCase() !== 'ALL'
    ) {
      andConditions.push({ teamType: filters.teamType.trim() });
    }

    if (
      filters.status &&
      filters.status.trim() &&
      filters.status.trim().toUpperCase() !== 'ALL'
    ) {
      andConditions.push({ status: filters.status.trim() });
    }

    if (filters.search && filters.search.trim()) {
      const sRegex = new RegExp(
        this.escapeRegex(filters.search.trim()),
        'i',
      );
      andConditions.push({
        $or: [
          { teamId: sRegex },
          { teamName: sRegex },
          { district: sRegex },
          { baseStation: sRegex },
          { contactPerson: sRegex },
          { contactPhone: sRegex },
          { notes: sRegex },
        ],
      });
    }

    const query = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const data = await this.teamModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      count: data.length,
      data: data as unknown as RescueTeam[],
    };
  }

  async getSummary(district?: string): Promise<{
    success: boolean;
    data: {
      totalTeams: number;
      totalMembers: number;
      availableTeams: number;
      deployedTeams: number;
      standbyTeams: number;
      offDutyTeams: number;
      byType: Record<string, number>;
    };
  }> {
    const query: any = { deletedAt: { $exists: false } };
    if (district && district.trim() && district.trim().toUpperCase() !== 'ALL') {
      query.district = new RegExp(
        `^${this.escapeRegex(district.trim())}$`,
        'i',
      );
    }

    const teams = await this.teamModel.find(query).lean();

    let totalMembers = 0;
    let availableTeams = 0;
    let deployedTeams = 0;
    let standbyTeams = 0;
    let offDutyTeams = 0;
    const byType: Record<string, number> = {};

    for (const t of teams) {
      totalMembers += t.memberCount || 0;
      if (t.status === RescueTeamStatus.AVAILABLE) availableTeams++;
      else if (t.status === RescueTeamStatus.DEPLOYED) deployedTeams++;
      else if (t.status === RescueTeamStatus.STANDBY) standbyTeams++;
      else if (t.status === RescueTeamStatus.OFF_DUTY) offDutyTeams++;

      const typeKey = t.teamType || 'OTHER';
      byType[typeKey] = (byType[typeKey] || 0) + 1;
    }

    return {
      success: true,
      data: {
        totalTeams: teams.length,
        totalMembers,
        availableTeams,
        deployedTeams,
        standbyTeams,
        offDutyTeams,
        byType,
      },
    };
  }

  async findById(id: string): Promise<{ success: boolean; data: RescueTeam }> {
    let team: RescueTeamDocument | null = null;

    if (Types.ObjectId.isValid(id)) {
      team = await this.teamModel.findOne({
        _id: id,
        deletedAt: { $exists: false },
      });
    }

    if (!team) {
      team = await this.teamModel.findOne({
        teamId: new RegExp(`^${this.escapeRegex(id)}$`, 'i'),
        deletedAt: { $exists: false },
      });
    }

    if (!team) {
      throw new NotFoundException(`Rescue team "${id}" not found.`);
    }

    return {
      success: true,
      data: team,
    };
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateRescueTeamDto,
  ): Promise<{ success: boolean; message: string; data: RescueTeam }> {
    const officer = await this.assertOfficer(userId);

    const query: any = { deletedAt: { $exists: false } };
    if (Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.teamId = new RegExp(`^${this.escapeRegex(id)}$`, 'i');
    }

    const team = await this.teamModel.findOne(query);
    if (!team) {
      throw new NotFoundException(`Rescue team "${id}" not found.`);
    }

    if (dto.teamId && dto.teamId.trim() !== team.teamId) {
      const duplicate = await this.teamModel.findOne({
        _id: { $ne: team._id },
        teamId: new RegExp(`^${this.escapeRegex(dto.teamId.trim())}$`, 'i'),
        deletedAt: { $exists: false },
      });
      if (duplicate) {
        throw new ConflictException(
          `Rescue Team with ID "${dto.teamId}" already exists.`,
        );
      }
      team.teamId = dto.teamId.trim();
    }

    if (dto.teamName !== undefined) team.teamName = dto.teamName;
    if (dto.teamType !== undefined) team.teamType = dto.teamType;
    if (dto.memberCount !== undefined) team.memberCount = dto.memberCount;
    if (dto.district !== undefined) team.district = dto.district;
    if (dto.baseStation !== undefined) team.baseStation = dto.baseStation;
    if (dto.contactPerson !== undefined) team.contactPerson = dto.contactPerson;
    if (dto.contactPhone !== undefined) team.contactPhone = dto.contactPhone;
    if (dto.status !== undefined) team.status = dto.status;
    if (dto.specialization !== undefined) team.specialization = dto.specialization;
    if (dto.notes !== undefined) team.notes = dto.notes;

    team.updatedBy = officer._id;

    await team.save();

    return {
      success: true,
      message: 'Rescue team updated successfully.',
      data: team,
    };
  }

  async updateStatus(
    id: string,
    userId: string,
    status: RescueTeamStatus,
    notes?: string,
  ): Promise<{ success: boolean; message: string; data: RescueTeam }> {
    const officer = await this.assertOfficer(userId);

    const query: any = { deletedAt: { $exists: false } };
    if (Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.teamId = new RegExp(`^${this.escapeRegex(id)}$`, 'i');
    }

    const team = await this.teamModel.findOne(query);
    if (!team) {
      throw new NotFoundException(`Rescue team "${id}" not found.`);
    }

    team.status = status;
    if (notes) {
      team.notes = notes;
    }
    team.updatedBy = officer._id;

    await team.save();

    return {
      success: true,
      message: `Rescue team status updated to ${status}.`,
      data: team,
    };
  }

  async delete(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.assertOfficer(userId);

    const query: any = { deletedAt: { $exists: false } };
    if (Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.teamId = new RegExp(`^${this.escapeRegex(id)}$`, 'i');
    }

    const team = await this.teamModel.findOne(query);
    if (!team) {
      throw new NotFoundException(`Rescue team "${id}" not found.`);
    }

    team.deletedAt = new Date();
    await team.save();

    return {
      success: true,
      message: `Rescue team "${team.teamName}" (${team.teamId}) has been removed.`,
    };
  }
}
