import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import { RescueTeam, RescueTeamDocument, RescueTeamStatus } from '../rescue-teams/schemas/rescue-team.schema';
import { CreateHelpRequestDto } from './dto/create-help-request.dto';
import { AssignHelpRequestDto } from './dto/assign-help-request.dto';
import { UpdateHelpRequestStatusDto } from './dto/update-help-request-status.dto';
import { HelpRequest, HelpRequestDocument, HelpRequestStatus, HelpRequestUrgency } from './schemas/help-request.schema';

type RequestUser = { id: string; role: UserRole | string };
const OFFICER_ROLES = [UserRole.DUTY_OFFICER, UserRole.DISTRICT_OFFICER, UserRole.ADMIN, UserRole.SYSTEM_ADMIN];

@Injectable()
export class HelpRequestsService {
  constructor(
    @InjectModel(HelpRequest.name) private readonly requestModel: Model<HelpRequestDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RescueTeam.name) private readonly teamModel: Model<RescueTeamDocument>,
  ) {}

  private assertOfficer(user: RequestUser) {
    if (!OFFICER_ROLES.includes(user.role as UserRole)) throw new ForbiddenException('Only authorized DMC officers can manage help requests.');
  }
  private async getCitizen(id: string, requirePhone = true) {
    const user = await this.userModel.findById(id);
    if (!user || !user.isActive || user.deletedAt) throw new ForbiddenException('Your account is not active.');
    if (![UserRole.CITIZEN, UserRole.VOLUNTEER].includes(user.role)) throw new ForbiddenException('Only citizens and volunteers can create help requests.');
    if (requirePhone && !user.phone) throw new BadRequestException('Please add a phone number to your profile before requesting help.');
    return user;
  }
  private parseLocation(dto: CreateHelpRequestDto) {
    const hasLat = dto.latitude !== undefined && dto.latitude !== '';
    const hasLng = dto.longitude !== undefined && dto.longitude !== '';
    if (hasLat !== hasLng) throw new BadRequestException('Latitude and longitude must be provided together.');
    const latitude = hasLat ? Number(dto.latitude) : undefined;
    const longitude = hasLng ? Number(dto.longitude) : undefined;
    if (!hasLat && !dto.locationDescription?.trim()) throw new BadRequestException('Current GPS location or a manual location description is required.');
    return { latitude, longitude };
  }
  private makeNumber() { return `HELP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`; }

  async create(citizenId: string, dto: CreateHelpRequestDto) {
    const citizen = await this.getCitizen(citizenId);
    const description = dto.description?.trim();
    if (!description) throw new BadRequestException('Please describe the help you need.');
    const { latitude, longitude } = this.parseLocation(dto);
    const request = await this.requestModel.create({
      requestNumber: this.makeNumber(), citizenId: citizen._id,
      citizenName: citizen.fullName, citizenEmail: citizen.email, citizenPhone: citizen.phone,
      description, urgency: dto.urgency ?? HelpRequestUrgency.HIGH,
      latitude, longitude, locationDescription: dto.locationDescription?.trim() || undefined,
      district: (dto.district || citizen.district)?.trim(), city: (dto.city || citizen.livingCity)?.trim(),
      status: HelpRequestStatus.PENDING, submittedAt: new Date(),
    });
    return { success: true, message: 'Your request for help has been sent to the DMC.', data: request };
  }

  async findMine(citizenId: string) {
    await this.getCitizen(citizenId, false);
    const data = await this.requestModel.find({ citizenId, status: { $ne: HelpRequestStatus.CANCELLED } }).sort({ submittedAt: -1 }).lean();
    return { success: true, count: data.length, data };
  }

  async findAll(user: RequestUser, filters: { district?: string; status?: string }) {
    this.assertOfficer(user);
    const query: Record<string, any> = {};
    if (filters.district?.trim()) query.district = new RegExp(`^${filters.district.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (filters.status) {
      if (!Object.values(HelpRequestStatus).includes(filters.status as HelpRequestStatus)) throw new BadRequestException('Invalid help request status.');
      query.status = filters.status;
    }
    const data = await this.requestModel.find(query).sort({ urgency: -1, submittedAt: 1 }).lean();
    return { success: true, count: data.length, data };
  }

  async findOne(user: RequestUser, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid help request ID.');
    const request = await this.requestModel.findById(id).lean();
    if (!request) throw new NotFoundException('Help request not found.');
    if (OFFICER_ROLES.includes(user.role as UserRole)) return { success: true, data: request };
    if (String(request.citizenId) !== user.id) throw new ForbiddenException('You can only view your own help requests.');
    return { success: true, data: request };
  }

  async assign(user: RequestUser, id: string, dto: AssignHelpRequestDto) {
    this.assertOfficer(user);
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid help request ID.');
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Help request not found.');
    if ([HelpRequestStatus.RESOLVED, HelpRequestStatus.CANCELLED].includes(request.status)) throw new BadRequestException('A resolved or cancelled request cannot be assigned.');
    const team = await this.teamModel.findOne({ _id: dto.teamId, deletedAt: { $exists: false } });
    if (!team) throw new NotFoundException('Rescue team not found.');
    if (team.status !== RescueTeamStatus.AVAILABLE && team.status !== RescueTeamStatus.STANDBY) throw new BadRequestException('Selected rescue team is not available.');
    if (request.district && team.district && request.district.toLowerCase() !== team.district.toLowerCase() && user.role !== UserRole.ADMIN && user.role !== UserRole.SYSTEM_ADMIN) throw new ForbiddenException('Assign a team from the request district, or ask an administrator to override.');
    team.status = RescueTeamStatus.DEPLOYED;
    team.updatedBy = new Types.ObjectId(user.id);
    await team.save();
    request.assignedTeamId = team._id as Types.ObjectId;
    request.assignedTeamName = team.teamName;
    request.assignedBy = new Types.ObjectId(user.id);
    request.assignedAt = new Date();
    request.officerNotes = dto.officerNotes?.trim() || request.officerNotes;
    request.status = HelpRequestStatus.ASSIGNED;
    await request.save();
    return { success: true, message: `Help request assigned to ${team.teamName}.`, data: request };
  }

  async updateStatus(user: RequestUser, id: string, dto: UpdateHelpRequestStatusDto) {
    this.assertOfficer(user);
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid help request ID.');
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Help request not found.');
    if (dto.status === HelpRequestStatus.ASSIGNED && !request.assignedTeamId) throw new BadRequestException('Assign a rescue team before setting status to ASSIGNED.');
    if (dto.status === HelpRequestStatus.IN_PROGRESS && !request.assignedTeamId) throw new BadRequestException('Assign a rescue team before starting the operation.');
    if (dto.status === HelpRequestStatus.PENDING && request.assignedTeamId) throw new BadRequestException('Unassign the rescue team before returning this request to PENDING.');
    request.status = dto.status;
    if (dto.officerNotes !== undefined) request.officerNotes = dto.officerNotes.trim();
    await request.save();
    if ([HelpRequestStatus.RESOLVED, HelpRequestStatus.CANCELLED].includes(dto.status) && request.assignedTeamId) {
      await this.teamModel.findByIdAndUpdate(request.assignedTeamId, { $set: { status: RescueTeamStatus.AVAILABLE } });
    }
    return { success: true, message: 'Help request status updated.', data: request };
  }
}
