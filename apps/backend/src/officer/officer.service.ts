import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';

@Injectable()
export class OfficerService {
  constructor(
    @InjectModel('User') private readonly users: Model<any>,
    @InjectModel('DistrictChangeRequest') private readonly requests: Model<any>,
  ) {}

  async verifyEmail(token: string) {
    if (!token) throw new BadRequestException('Verification token is required');
    const hash = createHash('sha256').update(token).digest('hex');
    const user = await this.users.findOne({
      role: 'DUTY_OFFICER',
      emailVerificationTokenHash: hash,
      emailVerificationExpiresAt: { $gt: new Date() },
    });
    if (!user) throw new BadRequestException('Verification link is invalid or expired');
    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    return { success: true, message: 'Email verified. Log in and complete your profile.' };
  }

  async getProfile(id: string) {
    const user = await this.users.findOne({ _id: id, role: 'DUTY_OFFICER' })
      .select('-passwordHash -password -emailVerificationTokenHash -emailVerificationExpiresAt');
    if (!user) throw new NotFoundException('Duty Officer not found');
    const fields = [
      user.fullName, user.email, user.officerIdNumber, user.dmcNumber,
      user.workingLocation, user.officePhoneNumber, user.residentialAddress, user.officeAddress,
    ];
    const profileComplete = user.emailVerified === true
      && fields.every(v => typeof v === 'string' && v.trim())
      && Array.isArray(user.assignedDistricts) && user.assignedDistricts.length > 0;
    return { success: true, data: { ...user.toObject(), profileComplete } };
  }

  async updateProfile(id: string, dto: UpdateOfficerProfileShape) {
    const user = await this.users.findOne({ _id: id, role: 'DUTY_OFFICER' });
    if (!user) throw new NotFoundException('Duty Officer not found');
    if (!user.isActive) throw new UnauthorizedException('Officer account is inactive');
    if (!user.emailVerified) throw new UnauthorizedException('Verify your email before completing your profile');

    user.fullName = dto.fullName.trim();
    user.officerIdNumber = dto.officerIdNumber.trim();
    user.dmcNumber = dto.dmcNumber.trim();
    user.workingLocation = dto.workingLocation.trim();
    user.officePhoneNumber = dto.officePhoneNumber.trim();
    user.residentialAddress = dto.residentialAddress.trim();
    user.officeAddress = dto.officeAddress.trim();
    // Assigned districts are deliberately not accepted in this DTO.
    user.mustCompleteProfile = false;
    await user.save();
    return { success: true, message: 'Profile updated', data: await this.getProfile(id) };
  }

  async createDistrictRequest(id: string, dto: CreateDistrictRequestShape) {
    const officer = await this.users.findOne({ _id: id, role: 'DUTY_OFFICER' });
    if (!officer) throw new NotFoundException('Duty Officer not found');
    const districts = [...new Set(dto.districts.map(d => d.trim()).filter(Boolean))];
    if (!districts.length) throw new BadRequestException('Select at least one district');

    const assigned = new Set<string>(officer.assignedDistricts || []);
    if (dto.action === 'ADD' && districts.every(d => assigned.has(d))) {
      throw new BadRequestException('Requested districts are already assigned');
    }
    if (dto.action === 'REMOVE' && districts.some(d => !assigned.has(d))) {
      throw new BadRequestException('You can only request removal of districts assigned to you');
    }
    if (dto.action === 'REMOVE' && districts.length >= assigned.size && districts.every(d => assigned.has(d))) {
      throw new BadRequestException('An officer must keep at least one assigned district');
    }
    const pending = await this.requests.findOne({ officerId: officer._id, status: 'PENDING' });
    if (pending) throw new ConflictException('You already have a pending district-change request');

    const request = await this.requests.create({
      officerId: officer._id,
      action: dto.action,
      districts,
      reason: dto.reason.trim(),
      status: 'PENDING',
    });
    return { success: true, message: 'District-change request sent to admin', data: request };
  }

  async listMyDistrictRequests(id: string) {
    return { success: true, data: await this.requests.find({ officerId: id }).sort({ createdAt: -1 }).lean() };
  }
}
type UpdateOfficerProfileShape = {
  fullName: string; officerIdNumber: string; dmcNumber: string; workingLocation: string;
  officePhoneNumber: string; residentialAddress: string; officeAddress: string;
};
type CreateDistrictRequestShape = { action: 'ADD' | 'REMOVE'; districts: string[]; reason: string };
