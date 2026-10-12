
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/schemas/user.schema';

import { ReliefSuppliesService } from './relief-supplies.service';
import { ReliefSupplyDistributionsService } from './relief-supply-distributions.service';

import { CreateReliefSupplyDto } from './dto/create-relief-supply.dto';
import { UpdateReliefSupplyStockDto } from './dto/update-relief-supply-stock.dto';
import { CreateReliefSupplyDistributionDto } from './dto/create-relief-supply-distribution.dto';
import { UpdateReliefSupplyDistributionDto } from './dto/update-relief-supply-distribution.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: UserRole;
    email: string;
  };
}

@Controller('relief-supplies')
@UseGuards(JwtAuthGuard)
export class ReliefSuppliesController {
  constructor(
    private readonly reliefSuppliesService: ReliefSuppliesService,
    private readonly distributionsService: ReliefSupplyDistributionsService,
  ) {}

  // Register a new supply item.
  @Post()
  create(
    @Body() dto: CreateReliefSupplyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reliefSuppliesService.create(dto, req.user);
  }

  // List and filter supply inventory.
  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.reliefSuppliesService.findAll(req.user, {
      search,
      category,
      status,
    });
  }

  // Allocate supplies to a shelter.
  @Post('distributions')
  createDistribution(
    @Body() dto: CreateReliefSupplyDistributionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.distributionsService.create(dto, req.user);
  }

  // List distribution records.
  @Get('distributions')
  findAllDistributions(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.distributionsService.findAll(req.user);
  }

  // Update dispatch, delivery, or cancellation status.
  @Patch('distributions/:id/status')
  updateDistributionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReliefSupplyDistributionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.distributionsService.updateStatus(
      id,
      dto,
      req.user,
    );
  }

  // Add received stock to an existing supply.
  @Post(':id/add-stock')
  addStock(
    @Param('id') id: string,
    @Body() dto: UpdateReliefSupplyStockDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reliefSuppliesService.addStock(
      id,
      dto,
      req.user,
    );
  }

  // Retrieve a single supply item.
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reliefSuppliesService.findOne(id, req.user);
  }
}
