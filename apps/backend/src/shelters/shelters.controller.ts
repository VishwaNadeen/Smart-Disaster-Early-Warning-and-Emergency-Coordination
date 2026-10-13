
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model } from 'mongoose';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import {
  User,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';

import { SheltersService } from './shelters.service';
import { ShelterStaffService } from './shelter-staff.service';

import { CreateShelterDto } from './dto/create-shelter.dto';
import { CreateShelterStaffDto } from './dto/create-shelter-staff.dto';
import { UpdateShelterDto } from './dto/update-shelter.dto';

import { ShelterOperationalStatus } from './schemas/shelter.schema';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: UserRole;
    email: string;
  };
}

interface ShelterActor {
  id: string;
  role: UserRole;
  district?: string;
  assignedDistricts?: string[];
  assignedShelterIds?: UserDocument['assignedShelterIds'];
}

@Controller('shelters')
@UseGuards(JwtAuthGuard)
export class SheltersController {
  constructor(
    private readonly sheltersService: SheltersService,
    private readonly shelterStaffService: ShelterStaffService,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // REVIEW [DRY/DIP]: duplicated in ReliefSupplyRequestsController and injects UserModel into a controller - use a guard or @CurrentUser() decorator.
  private async getAuthenticatedUser(
    req: AuthenticatedRequest,
  ): Promise<ShelterActor> {
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

  // Create a shelter.
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateShelterDto,
  ) {
    const user = await this.getAuthenticatedUser(req);
    return this.sheltersService.create(dto, user);
  }

  // Create and assign a Shelter Staff account.
  @Post(':id/staff')
  async createStaffForShelter(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CreateShelterStaffDto,
  ) {
    const user = await this.getAuthenticatedUser(req);

    return this.shelterStaffService.createForShelter(
      id,
      dto,
      user,
    );
  }

  // List shelters with optional filters.
  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('isActive') isActive?: string,
    @Query('operationalStatus') operationalStatus?: string,
  ) {
    const user = await this.getAuthenticatedUser(req);

    // REVIEW [SRP]: query validation belongs in a DTO (e.g. ShelterQueryDto with @IsEnum), not in the controller.
    if (
      operationalStatus &&
      !Object.values(ShelterOperationalStatus).includes(
        operationalStatus as ShelterOperationalStatus,
      )
    ) {
      throw new BadRequestException(
        'Invalid operationalStatus filter.',
      );
    }

    return this.sheltersService.findAll(user, {
      city,
      district,
      isActive,
      operationalStatus:
        operationalStatus as
          | ShelterOperationalStatus
          | undefined,
    });
  }

  // Retrieve one shelter.
  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const user = await this.getAuthenticatedUser(req);
    return this.sheltersService.findOne(id, user);
  }

  // Update shelter registry details.
  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateShelterDto,
  ) {
    const user = await this.getAuthenticatedUser(req);
    return this.sheltersService.update(id, dto, user);
  }

  // Deactivate a shelter without deleting its record.
  @Patch(':id/deactivate')
  async deactivate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const user = await this.getAuthenticatedUser(req);
    return this.sheltersService.setActive(id, false, user);
  }

  // Reactivate a shelter.
  @Patch(':id/activate')
  async activate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const user = await this.getAuthenticatedUser(req);
    return this.sheltersService.setActive(id, true, user);
  }
}
