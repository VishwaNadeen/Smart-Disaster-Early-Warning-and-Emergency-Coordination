
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { RescueTeamsService } from '../../src/rescue-teams/rescue-teams.service';
import {
  RescueTeam,
  RescueTeamStatus,
  RescueTeamType,
} from '../../src/rescue-teams/schemas/rescue-team.schema';
import {
  User,
  UserRole,
} from '../../src/users/schemas/user.schema';
import type { CreateRescueTeamDto } from '../../src/rescue-teams/dto/create-rescue-team.dto';

// [SE3070 - TEST FIX]
// A real class is used because the service creates documents
// using "new this.teamModel(...)" and then calls ".save()".
class MockRescueTeamModel {
  static findOne = vi.fn();
  static find = vi.fn();
  static countDocuments = vi.fn();

  _id: Types.ObjectId;

  constructor(data: Record<string, unknown>) {
    Object.assign(this, data);
    this._id = new Types.ObjectId();
  }

  async save(): Promise<this> {
    return this;
  }
}

// [SE3070 - TEST] Mock the User model.
const userModelMock = {
  findById: vi.fn(),
};

describe('RescueTeamsService', () => {
  let service: RescueTeamsService;

  const officerId = new Types.ObjectId().toHexString();

  const officer = {
    _id: new Types.ObjectId(officerId),
    fullName: 'DMC Officer',
    isActive: true,
    role: UserRole.ADMIN,
  };

  const dto: CreateRescueTeamDto = {
    teamId: 'RT-001',
    teamName: 'Alpha',
    teamType: RescueTeamType.ARMY,
    memberCount: 5,
    district: 'Colombo',
  };

  // [SE3070 - TEST] Reusable rescue team fixture.
  const makeTeam = (
    extra: Record<string, unknown> = {},
  ) => ({
    _id: new Types.ObjectId(),
    teamId: 'RT-001',
    teamName: 'Alpha',
    teamType: RescueTeamType.ARMY,
    memberCount: 5,
    district: 'Colombo',
    status: RescueTeamStatus.AVAILABLE,
    notes: '',
    updatedBy: undefined as Types.ObjectId | undefined,
    deletedAt: undefined as Date | undefined,
    save: vi.fn().mockResolvedValue(undefined),
    ...extra,
  });

  // [SE3070 - TEST] Simulate an authorized officer.
  const authorize = () => {
    userModelMock.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(officer),
    });
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        RescueTeamsService,
        {
          provide: getModelToken(RescueTeam.name),
          useValue: MockRescueTeamModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModelMock,
        },
      ],
    }).compile();

    service = module.get<RescueTeamsService>(
      RescueTeamsService,
    );

    authorize();
  });

  // ==================================================
  // CREATE RESCUE TEAM
  // ==================================================
  describe('create', () => {
    it('creates a rescue team successfully', async () => {
      MockRescueTeamModel.findOne.mockResolvedValue(null);

      const result = await service.create(
        officerId,
        dto,
      );

      expect(result.success).toBe(true);

      expect(result.message).toBe(
        'Rescue team registered successfully.',
      );

      expect(result.data).toEqual(
        expect.objectContaining({
          teamId: 'RT-001',
          status: RescueTeamStatus.AVAILABLE,
          createdBy: officer._id,
          createdByName: 'DMC Officer',
          specialization: [],
        }),
      );

    expect(result.data).toEqual(
  expect.objectContaining({
    _id: expect.any(Types.ObjectId),
  }),
);
    });

    it('rejects duplicate team IDs', async () => {
      MockRescueTeamModel.findOne.mockResolvedValue(
        makeTeam(),
      );

      await expect(
        service.create(officerId, dto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('generates a team ID when none is provided', async () => {
      MockRescueTeamModel.countDocuments.mockResolvedValue(2);

      const result = await service.create(
        officerId,
        {
          ...dto,
          teamId: undefined,
        },
      );

      expect(result.data.teamId).toMatch(
        /^RT-ARM-\d{4}-03\d{3}$/,
      );

      expect(
        MockRescueTeamModel.countDocuments,
      ).toHaveBeenCalledWith({
        teamType: RescueTeamType.ARMY,
      });
    });

    it('rejects inactive officers', async () => {
      userModelMock.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          ...officer,
          isActive: false,
        }),
      });

      await expect(
        service.create(officerId, dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects nonexistent officers', async () => {
      userModelMock.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        service.create(officerId, dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects unauthorized roles', async () => {
      userModelMock.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          ...officer,
          role: 'CITIZEN',
        }),
      });

      await expect(
        service.create(officerId, dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ==================================================
  // GET ALL RESCUE TEAMS
  // ==================================================
  describe('findAll', () => {
    it('returns active rescue teams sorted by creation date', async () => {
      const teams = [makeTeam()];

      const lean = vi.fn().mockResolvedValue(teams);
      const sort = vi.fn().mockReturnValue({ lean });

      MockRescueTeamModel.find.mockReturnValue({
        sort,
      });

      const result = await service.findAll({});

      expect(result).toEqual({
        success: true,
        count: 1,
        data: teams,
      });

      expect(
        MockRescueTeamModel.find,
      ).toHaveBeenCalledWith({
        deletedAt: { $exists: false },
      });

      expect(sort).toHaveBeenCalledWith({
        createdAt: -1,
      });
    });

    it('applies district, type, status, and search filters', async () => {
      MockRescueTeamModel.find.mockReturnValue({
        sort: () => ({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      await service.findAll({
        district: 'Colombo',
        teamType: RescueTeamType.ARMY,
        status: RescueTeamStatus.AVAILABLE,
        search: 'Alpha',
      });

      expect(
        MockRescueTeamModel.find,
      ).toHaveBeenCalledWith({
        $and: expect.arrayContaining([
          { deletedAt: { $exists: false } },
          { district: /^Colombo$/i },
          { teamType: RescueTeamType.ARMY },
          { status: RescueTeamStatus.AVAILABLE },
          expect.objectContaining({
            $or: expect.any(Array),
          }),
        ]),
      });
    });

    it('ignores the ALL district filter', async () => {
      MockRescueTeamModel.find.mockReturnValue({
        sort: () => ({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      await service.findAll({
        district: 'ALL',
      });

      expect(
        MockRescueTeamModel.find,
      ).toHaveBeenCalledWith({
        deletedAt: { $exists: false },
      });
    });
  });

  // ==================================================
  // RESCUE TEAM SUMMARY
  // ==================================================
  describe('getSummary', () => {
    it('calculates rescue team statistics correctly', async () => {
      const teams = [
        makeTeam({
          memberCount: 5,
          status: RescueTeamStatus.AVAILABLE,
        }),
        makeTeam({
          memberCount: 3,
          status: RescueTeamStatus.DEPLOYED,
        }),
        makeTeam({
          memberCount: 2,
          status: RescueTeamStatus.STANDBY,
          teamType: RescueTeamType.POLICE,
        }),
        makeTeam({
          memberCount: 1,
          status: RescueTeamStatus.OFF_DUTY,
        }),
      ];

      MockRescueTeamModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue(teams),
      });

      const result = await service.getSummary(
        'Colombo',
      );

      expect(result.data).toEqual({
        totalTeams: 4,
        totalMembers: 11,
        availableTeams: 1,
        deployedTeams: 1,
        standbyTeams: 1,
        offDutyTeams: 1,
        byType: {
          [RescueTeamType.ARMY]: 3,
          [RescueTeamType.POLICE]: 1,
        },
      });

      expect(
        MockRescueTeamModel.find,
      ).toHaveBeenCalledWith({
        deletedAt: { $exists: false },
        district: /^Colombo$/i,
      });
    });
  });

  // ==================================================
  // FIND RESCUE TEAM BY ID
  // ==================================================
  describe('findById', () => {
    it('finds a rescue team by team ID', async () => {
      const team = makeTeam();

      MockRescueTeamModel.findOne.mockResolvedValue(
        team,
      );

      const result = await service.findById(
        'RT-001',
      );

      expect(result).toEqual({
        success: true,
        data: team,
      });
    });

    it('finds a rescue team by MongoDB ObjectId', async () => {
      const id = new Types.ObjectId().toHexString();

      MockRescueTeamModel.findOne.mockResolvedValue(
        makeTeam(),
      );

      await service.findById(id);

      expect(
        MockRescueTeamModel.findOne,
      ).toHaveBeenCalledWith({
        _id: id,
        deletedAt: { $exists: false },
      });
    });

    it('throws NotFoundException when team is missing', async () => {
      MockRescueTeamModel.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.findById('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ==================================================
  // UPDATE RESCUE TEAM
  // ==================================================
  describe('update', () => {
    it('updates rescue team details', async () => {
      const team = makeTeam();

      MockRescueTeamModel.findOne.mockResolvedValue(
        team,
      );

      const result = await service.update(
        'RT-001',
        officerId,
        {
          teamName: 'Bravo',
          memberCount: 9,
        },
      );

      expect(result.data.teamName).toBe('Bravo');
      expect(result.data.memberCount).toBe(9);
      expect(team.updatedBy).toEqual(officer._id);
      expect(team.save).toHaveBeenCalledTimes(1);
    });

    it('rejects duplicate replacement team IDs', async () => {
      MockRescueTeamModel.findOne
        .mockResolvedValueOnce(makeTeam())
        .mockResolvedValueOnce(
          makeTeam({
            teamId: 'RT-002',
          }),
        );

      await expect(
        service.update(
          'RT-001',
          officerId,
          {
            teamId: 'RT-002',
          },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects updates to missing teams', async () => {
      MockRescueTeamModel.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.update(
          'missing',
          officerId,
          {
            teamName: 'Bravo',
          },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ==================================================
  // UPDATE RESCUE TEAM STATUS
  // ==================================================
  describe('updateStatus', () => {
    it('updates rescue team status and notes', async () => {
      const team = makeTeam();

      MockRescueTeamModel.findOne.mockResolvedValue(
        team,
      );

      const result = await service.updateStatus(
        'RT-001',
        officerId,
        RescueTeamStatus.DEPLOYED,
        'Dispatched',
      );

      expect(result.data.status).toBe(
        RescueTeamStatus.DEPLOYED,
      );

      expect(result.data.notes).toBe(
        'Dispatched',
      );

      expect(team.save).toHaveBeenCalledTimes(1);
    });

    it('rejects status updates for missing teams', async () => {
      MockRescueTeamModel.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.updateStatus(
          'missing',
          officerId,
          RescueTeamStatus.STANDBY,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ==================================================
  // DELETE RESCUE TEAM
  // ==================================================
  describe('delete', () => {
    it('soft deletes a rescue team', async () => {
      const team = makeTeam();

      MockRescueTeamModel.findOne.mockResolvedValue(
        team,
      );

      const result = await service.delete(
        'RT-001',
        officerId,
      );

      expect(result.success).toBe(true);

      expect(team.deletedAt).toBeInstanceOf(Date);

      expect(team.save).toHaveBeenCalledTimes(1);
    });

    it('rejects deletion of missing teams', async () => {
      MockRescueTeamModel.findOne.mockResolvedValue(
        null,
      );

      await expect(
        service.delete(
          'missing',
          officerId,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
