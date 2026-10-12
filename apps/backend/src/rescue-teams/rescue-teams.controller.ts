import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RescueTeamsService } from './rescue-teams.service';
import { CreateRescueTeamDto } from './dto/create-rescue-team.dto';
import { UpdateRescueTeamDto } from './dto/update-rescue-team.dto';
import {
  RescueTeam,
  RescueTeamStatus,
} from './schemas/rescue-team.schema';

@Controller('rescue-teams')
@UseGuards(JwtAuthGuard)
export class RescueTeamsController {
  constructor(
    private readonly rescueTeamsService: RescueTeamsService,
  ) {}

  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateRescueTeamDto,
  ): Promise<{ success: boolean; message: string; data: RescueTeam }> {
    return this.rescueTeamsService.create(req.user.id, dto);
  }

  @Get('summary')
  getSummary(
    @Query('district') district?: string,
  ): Promise<{
    success: boolean;
    data: {
      totalTeams: number;
      totalMembers: number;
      availableTeams: number;
      deployedTeams: number;
      standbyTeams: number;
      offDutyTeams: number;
      byType: Record<string, number>;
    };
  }> {
    return this.rescueTeamsService.getSummary(district);
  }

  @Get()
  findAll(
    @Query('district') district?: string,
    @Query('teamType') teamType?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<{ success: boolean; count: number; data: RescueTeam[] }> {
    return this.rescueTeamsService.findAll({
      district,
      teamType,
      status,
      search,
    });
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: RescueTeam }> {
    return this.rescueTeamsService.findById(id);
  }

  @Put(':id')
  updatePut(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRescueTeamDto,
  ): Promise<{ success: boolean; message: string; data: RescueTeam }> {
    return this.rescueTeamsService.update(id, req.user.id, dto);
  }

  @Patch(':id')
  updatePatch(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRescueTeamDto,
  ): Promise<{ success: boolean; message: string; data: RescueTeam }> {
    return this.rescueTeamsService.update(id, req.user.id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: RescueTeamStatus,
    @Body('notes') notes?: string,
  ): Promise<{ success: boolean; message: string; data: RescueTeam }> {
    return this.rescueTeamsService.updateStatus(
      id,
      req.user.id,
      status,
      notes,
    );
  }

  @Delete(':id')
  delete(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.rescueTeamsService.delete(id, req.user.id);
  }
}
