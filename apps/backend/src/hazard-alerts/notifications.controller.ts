import {
  Body,
  Controller,
  Delete,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import type { AuthenticatedRequest } from './authenticated-request';

import { NotificationPreferencesService } from './notification-preferences.service';

import { RegisterDeviceDto } from './dto/register-device.dto';

import { WhatsappConsentDto } from './dto/whatsapp-consent.dto';

/** Lets citizens manage how they receive hazard alerts. */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly preferences: NotificationPreferencesService,
  ) {}

  @Post('devices')
  registerDevice(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.preferences.registerDevice(
      req.user.id,
      dto.token,
    );
  }

  @Delete('devices')
  unregisterDevice(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.preferences.unregisterDevice(
      req.user.id,
      dto.token,
    );
  }

  @Put('whatsapp-consent')
  updateWhatsappConsent(
    @Req() req: AuthenticatedRequest,
    @Body() dto: WhatsappConsentDto,
  ) {
    return this.preferences.updateWhatsappConsent(
      req.user.id,
      dto.optIn,
    );
  }
}
