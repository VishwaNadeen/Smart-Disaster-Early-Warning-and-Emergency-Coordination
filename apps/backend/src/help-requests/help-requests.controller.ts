import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HelpRequestsService } from './help-requests.service';
import { CreateHelpRequestDto } from './dto/create-help-request.dto';
import { AssignHelpRequestDto } from './dto/assign-help-request.dto';
import { UpdateHelpRequestStatusDto } from './dto/update-help-request-status.dto';

@Controller('help-requests')
@UseGuards(JwtAuthGuard)
export class HelpRequestsController {
  constructor(private readonly service: HelpRequestsService) {}

  // Citizen mobile app: create a request; identity/contact are taken from the authenticated account.
  @Post()
  create(@Req() req: any, @Body() dto: CreateHelpRequestDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get('my')
  findMine(@Req() req: any) { return this.service.findMine(req.user.id); }

  // DMC officer queue; optional district/status filters.
  @Get()
  findAll(@Req() req: any, @Query('district') district?: string, @Query('status') status?: string) {
    return this.service.findAll(req.user, { district, status });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) { return this.service.findOne(req.user, id); }

  @Patch(':id/assign')
  assign(@Req() req: any, @Param('id') id: string, @Body() dto: AssignHelpRequestDto) {
    return this.service.assign(req.user, id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateHelpRequestStatusDto) {
    return this.service.updateStatus(req.user, id, dto);
  }
}
