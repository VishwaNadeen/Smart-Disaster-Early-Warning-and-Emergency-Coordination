import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AdminService } from './admin.service';
import { CreateOfficerDto } from './dto/create-officer.dto';
import { ReviewDistrictRequestDto } from './dto/review-district-request.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Post('officers')
  createOfficer(@Body() dto: CreateOfficerDto) { return this.service.createOfficer(dto); }

  @Get('officers')
  listOfficers() { return this.service.listOfficers(); }

  @Get('officers/:id')
  getOfficer(@Param('id') id: string) { return this.service.getOfficer(id); }

  @Patch('officers/:id/activate')
  activateOfficer(@Param('id') id: string) { return this.service.setOfficerActive(id, true); }

  @Patch('officers/:id/deactivate')
  deactivateOfficer(@Param('id') id: string) { return this.service.setOfficerActive(id, false); }

  @Get('district-requests')
  listDistrictRequests(@Query('status') status = 'PENDING') { return this.service.listDistrictRequests(status); }

  @Patch('district-requests/:id/review')
  reviewDistrictRequest(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewDistrictRequestDto) {
    return this.service.reviewDistrictRequest(String(req.user.id ?? req.user._id), id, dto);
  }
}
