
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model } from 'mongoose';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import {
  User,
  UserDocument,
} from '../users/schemas/user.schema';

import { ReliefSupplyRequestsService } from './relief-supply-requests.service';

import { CreateReliefSupplyRequestDto } from './dto/create-relief-supply-request.dto';

import { ReviewReliefSupplyRequestDto } from './dto/review-relief-supply-request.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    // REVIEW [Smell]: typed as string here but UserRole in the other controllers.
    role: string;
    email: string;
  };
}

@Controller('relief-supply-requests')
@UseGuards(JwtAuthGuard)
export class ReliefSupplyRequestsController {
  constructor(
    private readonly reliefSupplyRequestsService: ReliefSupplyRequestsService,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // Load the authenticated user's current role and assignments.
  // REVIEW [DRY/SRP]: identical to SheltersController.getAuthenticatedUser - move to a guard or a @CurrentUser() param decorator.
  private async getAuthenticatedUser(req: AuthenticatedRequest) {
    if (!req.user?.id) {
      throw new ForbiddenException(
        'Authenticated user ID is missing.',
      );
    }

    const user = await this.userModel
      .findById(req.user.id)
      .select(
        'role district assignedDistricts assignedShelterIds isActive',
      )
      .exec();

    if (!user || !user.isActive) {
      throw new ForbiddenException(
        'The user account is unavailable or inactive.',
      );
    }

    return {
      id: user.id,
      role: user.role,
      district: user.district,
      assignedDistricts: user.assignedDistricts ?? [],
      assignedShelterIds: user.assignedShelterIds ?? [],
    };
  }

  // POST /relief-supply-requests
  // Shelter staff submit a new supply request.
  @Post()
  async createRequest(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateReliefSupplyRequestDto,
  ) {
    const user = await this.getAuthenticatedUser(req);

    return this.reliefSupplyRequestsService.createRequest(
      user,
      dto,
    );
  }

  // GET /relief-supply-requests/my
  // Shelter staff view their assigned shelters' requests.
  @Get('my')
  async getMyRequests(
    @Req() req: AuthenticatedRequest,
  ) {
    const user = await this.getAuthenticatedUser(req);

    return this.reliefSupplyRequestsService.getMyRequests(
      user,
    );
  }

  // GET /relief-supply-requests
  // Authorized DMC officers view pending requests.
  @Get()
  async getOfficerRequests(
    @Req() req: AuthenticatedRequest,
  ) {
    const user = await this.getAuthenticatedUser(req);

    return this.reliefSupplyRequestsService.getOfficerRequests(
      user,
    );
  }

  // PATCH /relief-supply-requests/:id/decision
  // Authorized DMC officers approve or reject a request.
  @Patch(':id/decision')
  async reviewRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReviewReliefSupplyRequestDto,
  ) {
    const user = await this.getAuthenticatedUser(req);

    return this.reliefSupplyRequestsService.reviewRequest(
      user,
      id,
      dto,
    );
  }
}
