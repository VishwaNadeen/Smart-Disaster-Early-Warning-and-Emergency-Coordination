
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

import { HazardAlertsService } from './hazard-alerts.service';

import { RegisterDeviceDto } from './dto/register-device.dto';

import { WhatsappConsentDto } from './dto/whatsapp-consent.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly hazardAlertsService: HazardAlertsService,
  ) {}

  @Post('devices')
  registerDevice(
    @Req() req: any,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.hazardAlertsService.registerDevice(
      req.user.id,
      dto.token,
    );
  }

  @Delete('devices')
  unregisterDevice(
    @Req() req: any,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.hazardAlertsService.unregisterDevice(
      req.user.id,
      dto.token,
    );
  }

  @Put('whatsapp-consent')
  updateWhatsappConsent(
    @Req() req: any,
    @Body() dto: WhatsappConsentDto,
  ) {
    return this.hazardAlertsService.updateWhatsappConsent(
      req.user.id,
      dto.optIn,
    );
  }
}
