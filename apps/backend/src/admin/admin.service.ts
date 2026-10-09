import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { EmailService } from '../common/email.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel('User') private readonly users: Model<any>,
    @InjectModel('DistrictChangeRequest') private readonly requests: Model<any>,
    private readonly email: EmailService,
  ) {}

  private safeUser(user: any) {
    const obj = user?.toObject ? user.toObject() : { ...user };
    delete obj.passwordHash;
    delete obj.password;
    delete obj.emailVerificationTokenHash;
    delete obj.emailVerificationExpiresAt;
    return obj;
  }

  async createOfficer(dto: CreateOfficerDtoShape) {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findOne({ email })) throw new ConflictException('Email is already registered');
    const districts = [...new Set(dto.assignedDistricts.map(d => d.trim()).filter(Boolean))];
    if (!districts.length) throw new BadRequestException('Assign at least one district');

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(dto.initialPassword, 12);

    const officer = await this.users.create({
      fullName: dto.fullName.trim(),
      email,
      passwordHash,
      role: 'DUTY_OFFICER',
      isActive: true,
      emailVerified: false,
      mustCompleteProfile: true,
      assignedDistricts: districts,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    try {
      await this.email.sendOfficerVerificationEmail(email, token);
    } catch (error) {
      await this.users.findByIdAndDelete(officer._id);
      throw error;
    }

    return {
      success: true,
      message: 'Officer account created and verification email sent. Deliver the initial password via a separate secure channel.',
      data: { officer: this.safeUser(officer) },
    };
  }

  async listOfficers() {
    const officers = await this.users.find({ role: 'DUTY_OFFICER' }).sort({ createdAt: -1 });
    return { success: true, data: officers.map(o => this.safeUser(o)) };
  }

  async getOfficer(id: string) {
    const officer = await this.users.findOne({ _id: id, role: 'DUTY_OFFICER' });
    if (!officer) throw new NotFoundException('Duty Officer not found');
    return { success: true, data: this.safeUser(officer) };
  }

  async setOfficerActive(id: string, isActive: boolean) {
    const officer = await this.users.findOneAndUpdate(
      { _id: id, role: 'DUTY_OFFICER' },
      { $set: { isActive } },
      { new: true },
    );
    if (!officer) throw new NotFoundException('Duty Officer not found');
    return { success: true, message: isActive ? 'Officer activated' : 'Officer deactivated', data: this.safeUser(officer) };
  }

  async listDistrictRequests(status = 'PENDING') {
    const filter: any = {};
    if (status !== 'ALL') filter.status = status;
    return { success: true, data: await this.requests.find(filter).sort({ createdAt: 1 }).lean() };
  }

  async reviewDistrictRequest(adminId: string, requestId: string, dto: ReviewDistrictRequestShape) {
    const request = await this.requests.findOne({ _id: requestId, status: 'PENDING' });
    if (!request) throw new NotFoundException('Pending district-change request not found');
    const officer = await this.users.findOne({ _id: request.officerId, role: 'DUTY_OFFICER' });
    if (!officer) throw new NotFoundException('Duty Officer not found');

    if (dto.decision === 'APPROVE') {
      const assigned = new Set<string>(officer.assignedDistricts || []);
      if (request.action === 'ADD') request.districts.forEach((d: string) => assigned.add(d));
      else request.districts.forEach((d: string) => assigned.delete(d));
      if (assigned.size === 0) throw new BadRequestException('Officer must retain at least one assigned district');
      officer.assignedDistricts = [...assigned];
      await officer.save();
    }

    request.status = dto.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    request.reviewMessage = dto.message.trim();
    await request.save();
    return { success: true, data: request };
  }
}

type CreateOfficerDtoShape = {
  fullName: string; email: string; initialPassword: string; assignedDistricts: string[];
};
type ReviewDistrictRequestShape = { decision: 'APPROVE' | 'REJECT'; message: string };
