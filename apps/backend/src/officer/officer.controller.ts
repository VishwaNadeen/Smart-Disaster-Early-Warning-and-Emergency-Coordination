import { Body, Controller, Get, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { OfficerService } from './officer.service';
import { UpdateOfficerProfileDto } from './dto/update-officer-profile.dto';
import { CreateDistrictRequestDto } from './dto/create-district-request.dto';

@Controller('officer')
export class OfficerController {
  constructor(private readonly service: OfficerService) {}

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) { return this.service.verifyEmail(token); }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUTY_OFFICER')
  getProfile(@Req() req: any) { return this.service.getProfile(String(req.user.id ?? req.user._id)); }

  @Put('me/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUTY_OFFICER')
  updateProfile(@Req() req: any, @Body() dto: UpdateOfficerProfileDto) {
    return this.service.updateProfile(String(req.user.id ?? req.user._id), dto);
  }

  @Post('me/district-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUTY_OFFICER')
  createDistrictRequest(@Req() req: any, @Body() dto: CreateDistrictRequestDto) {
    return this.service.createDistrictRequest(String(req.user.id ?? req.user._id), dto);
  }

  @Get('me/district-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUTY_OFFICER')
  listMyDistrictRequests(@Req() req: any) {
    return this.service.listMyDistrictRequests(String(req.user.id ?? req.user._id));
  }
}
