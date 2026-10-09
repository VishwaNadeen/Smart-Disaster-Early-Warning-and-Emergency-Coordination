
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

import { CreateHazardAlertDto } from './dto/create-hazard-alert.dto';

import { HazardAlertsService } from './hazard-alerts.service';

import {
  UserRole,
} from '../users/schemas/user.schema';

import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

class CancelAlertDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

@Controller('hazard-alerts')
@UseGuards(JwtAuthGuard)
export class HazardAlertsController {
  constructor(
    private readonly hazardAlertsService: HazardAlertsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.DUTY_OFFICER,
    UserRole.DISTRICT_OFFICER,
    UserRole.ADMIN,
    UserRole.SYSTEM_ADMIN,
  )
  publish(
    @Req() req: any,
    @Body() dto: CreateHazardAlertDto,
  ) {
    return this.hazardAlertsService.publish(
      req.user.id,
      dto,
    );
  }

  @Get()
  listPublished() {
    return this.hazardAlertsService.listPublished();
  }

  @Get(':id/deliveries')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.DUTY_OFFICER,
    UserRole.DISTRICT_OFFICER,
    UserRole.ADMIN,
    UserRole.SYSTEM_ADMIN,
  )
  listDeliveries(
    @Param('id') id: string,
  ) {
    return this.hazardAlertsService.listDeliveries(id);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.DUTY_OFFICER,
    UserRole.DISTRICT_OFFICER,
    UserRole.ADMIN,
    UserRole.SYSTEM_ADMIN,
  )
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelAlertDto,
  ) {
    return this.hazardAlertsService.cancelAlert(
      id,
      dto.reason,
    );
  }

  @Get(':id')
  getPublishedById(
    @Param('id') id: string,
  ) {
    return this.hazardAlertsService.getPublishedById(id);
  }
}
