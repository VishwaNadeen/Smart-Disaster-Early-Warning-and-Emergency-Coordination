// [SE3070 - NEW] Controller unit tests: service interactions only.
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { RescueTeamsController } from '../../src/rescue-teams/rescue-teams.controller';
import { RescueTeamsService } from '../../src/rescue-teams/rescue-teams.service';
import { RescueTeamStatus, RescueTeamType } from '../../src/rescue-teams/schemas/rescue-team.schema';
import { CreateRescueTeamDto } from '../../src/rescue-teams/dto/create-rescue-team.dto';
import { UpdateRescueTeamDto } from '../../src/rescue-teams/dto/update-rescue-team.dto';

describe('RescueTeamsController', () => {
  let controller: RescueTeamsController;
  const service = {
    create: vi.fn(), getSummary: vi.fn(), findAll: vi.fn(),
    findById: vi.fn(), update: vi.fn(), updateStatus: vi.fn(), delete: vi.fn(),
  };
  const req = { user: { id: 'officer-1' } };
  const team = { teamId: 'RT-001', teamName: 'Alpha', teamType: RescueTeamType.ARMY };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RescueTeamsController],
      providers: [{ provide: RescueTeamsService, useValue: service }],
    }).compile();
    controller = module.get(RescueTeamsController);
  });

  it('creates a rescue team using authenticated officer ID', async () => {
    const dto = { teamName: 'Alpha', teamType: RescueTeamType.ARMY, memberCount: 5 } as CreateRescueTeamDto;
    const result = { success: true, message: 'Created', data: team };
    service.create.mockResolvedValue(result);
    await expect(controller.create(req, dto)).resolves.toEqual(result);
    expect(service.create).toHaveBeenCalledWith('officer-1', dto);
  });

  it('gets the summary for a district', async () => {
    const result = { success: true, data: { totalTeams: 1 } };
    service.getSummary.mockResolvedValue(result);
    await expect(controller.getSummary('Colombo')).resolves.toEqual(result);
    expect(service.getSummary).toHaveBeenCalledWith('Colombo');
  });

  it('passes all filters to findAll', async () => {
    const result = { success: true, count: 1, data: [team] };
    service.findAll.mockResolvedValue(result);
    await expect(controller.findAll('Colombo', 'ARMY', 'AVAILABLE', 'Alpha')).resolves.toEqual(result);
    expect(service.findAll).toHaveBeenCalledWith({
      district: 'Colombo', teamType: 'ARMY', status: 'AVAILABLE', search: 'Alpha',
    });
  });

  it('gets a team by ID', async () => {
    const result = { success: true, data: team };
    service.findById.mockResolvedValue(result);
    await expect(controller.findById('RT-001')).resolves.toEqual(result);
    expect(service.findById).toHaveBeenCalledWith('RT-001');
  });

  it('updates a team via PUT', async () => {
    const dto = { teamName: 'Updated' } as UpdateRescueTeamDto;
    const result = { success: true, message: 'Updated', data: team };
    service.update.mockResolvedValue(result);
    await expect(controller.updatePut(req, 'RT-001', dto)).resolves.toEqual(result);
    expect(service.update).toHaveBeenCalledWith('RT-001', 'officer-1', dto);
  });

  it('updates a team via PATCH', async () => {
    const dto = { memberCount: 8 } as UpdateRescueTeamDto;
    const result = { success: true, message: 'Updated', data: team };
    service.update.mockResolvedValue(result);
    await expect(controller.updatePatch(req, 'RT-001', dto)).resolves.toEqual(result);
    expect(service.update).toHaveBeenCalledWith('RT-001', 'officer-1', dto);
  });

  it('updates status with optional notes', async () => {
    const result = { success: true, message: 'Deployed', data: team };
    service.updateStatus.mockResolvedValue(result);
    await expect(controller.updateStatus(req, 'RT-001', RescueTeamStatus.DEPLOYED, 'Assigned')).resolves.toEqual(result);
    expect(service.updateStatus).toHaveBeenCalledWith('RT-001', 'officer-1', RescueTeamStatus.DEPLOYED, 'Assigned');
  });

  it('deletes a team using authenticated officer ID', async () => {
    const result = { success: true, message: 'Removed' };
    service.delete.mockResolvedValue(result);
    await expect(controller.delete(req, 'RT-001')).resolves.toEqual(result);
    expect(service.delete).toHaveBeenCalledWith('RT-001', 'officer-1');
  });

  it('propagates service errors', async () => {
    service.findById.mockRejectedValue(new Error('Not found'));
    await expect(controller.findById('missing')).rejects.toThrow('Not found');
  });
});
