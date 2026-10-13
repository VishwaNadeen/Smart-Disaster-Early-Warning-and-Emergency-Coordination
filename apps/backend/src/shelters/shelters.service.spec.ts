import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SheltersService } from './shelters.service';
import {
  Shelter,
  ShelterOperationalStatus,
} from './schemas/shelter.schema';
import { UserRole } from '../users/schemas/user.schema';

describe('SheltersService', () => {
  let service: SheltersService;
  let shelterModel: any;

  const shelterId = new Types.ObjectId().toString();

  const adminUser = {
    id: new Types.ObjectId().toString(),
    role: UserRole.ADMIN,
  };

  const dutyOfficer = {
    id: new Types.ObjectId().toString(),
    role: UserRole.DUTY_OFFICER,
    district: 'Colombo',
    assignedDistricts: ['Galle'],
  };

  const makeShelter = (overrides: Record<string, any> = {}) => ({
    _id: new Types.ObjectId(shelterId),
    name: 'Central Relief Shelter',
    shelterCode: 'COL-001',
    address: 'Main Street',
    city: 'Colombo',
    district: 'Colombo',
    province: 'Western',
    latitude: 6.9271,
    longitude: 79.8612,
    maximumCapacity: 200,
    operationalStatus: ShelterOperationalStatus.OPEN,
    isActive: true,
    facilities: [],
    notes: '',
    save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
    ...overrides,
  });

  const makeQuery = (result: any) => ({
    sort: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    shelterModel = {
      findOne: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SheltersService,
        {
          provide: getModelToken(Shelter.name),
          useValue: shelterModel,
        },
      ],
    }).compile();

    service = module.get<SheltersService>(SheltersService);
  });

  // ============================================================
  // CREATE SHELTER
  // ============================================================

  describe('create', () => {
    const dto = {
      name: 'Central Relief Shelter',
      shelterCode: ' col-001 ',
      address: 'Main Street',
      city: 'Colombo',
      district: 'Colombo',
      province: 'Western',
      latitude: 6.9271,
      longitude: 79.8612,
      maximumCapacity: 200,
      operationalStatus: ShelterOperationalStatus.OPEN,
    };

    it('POSITIVE: registers a shelter and normalizes its code', async () => {
      const createdShelter = makeShelter();

      shelterModel.findOne.mockResolvedValue(null);
      shelterModel.create.mockResolvedValue(createdShelter);

      const result = await service.create(dto as any, adminUser);

      expect(shelterModel.findOne).toHaveBeenCalledWith({
        shelterCode: 'COL-001',
      });

      expect(shelterModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dto,
          shelterCode: 'COL-001',
        }),
      );

      expect(result).toBe(createdShelter);
    });

    it('NEGATIVE: rejects a user who cannot manage shelters', async () => {
      await expect(
        service.create(dto as any, {
          id: new Types.ObjectId().toString(),
          role: UserRole.CITIZEN,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(shelterModel.create).not.toHaveBeenCalled();
    });

    it('NEGATIVE: prevents a duty officer from registering a shelter outside assigned districts', async () => {
      await expect(
        service.create(
          { ...dto, district: 'Kandy' } as any,
          dutyOfficer,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(shelterModel.findOne).not.toHaveBeenCalled();
    });

    it('POSITIVE: allows a duty officer to register a shelter in an assigned district', async () => {
      shelterModel.findOne.mockResolvedValue(null);
      shelterModel.create.mockResolvedValue(makeShelter());

      await expect(
        service.create(
          { ...dto, district: '  galle  ' } as any,
          dutyOfficer,
        ),
      ).resolves.toBeDefined();

      expect(shelterModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shelterCode: 'COL-001',
          district: '  galle  ',
        }),
      );
    });

    it('NEGATIVE: rejects a duplicate shelter code', async () => {
      shelterModel.findOne.mockResolvedValue(makeShelter());

      await expect(
        service.create(dto as any, adminUser),
      ).rejects.toThrow(ConflictException);

      expect(shelterModel.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // FIND ALL SHELTERS
  // ============================================================

  describe('findAll', () => {
    it('POSITIVE: allows an administrator to list shelters', async () => {
      const shelters = [makeShelter()];
      const query = makeQuery(shelters);

      shelterModel.find.mockReturnValue(query);

      const result = await service.findAll(adminUser, {});

      expect(shelterModel.find).toHaveBeenCalledWith({});
      expect(query.sort).toHaveBeenCalledWith({
        district: 1,
        city: 1,
        name: 1,
      });
      expect(result).toEqual(shelters);
    });

    it('POSITIVE: filters by city, district, active status, and operational status', async () => {
      const query = makeQuery([]);

      shelterModel.find.mockReturnValue(query);

      await service.findAll(adminUser, {
        city: 'Colombo',
        district: 'Colombo',
        isActive: 'true',
        operationalStatus: ShelterOperationalStatus.OPEN,
      });

      expect(shelterModel.find).toHaveBeenCalledWith({
        city: expect.any(RegExp),
        district: expect.any(RegExp),
        isActive: true,
        operationalStatus: ShelterOperationalStatus.OPEN,
      });

      const actualQuery = shelterModel.find.mock.calls[0][0];

      expect(actualQuery.city.test('Colombo')).toBe(true);
      expect(actualQuery.city.test('COLOMBO')).toBe(true);
      expect(actualQuery.city.test('Colombo Fort')).toBe(false);
    });

    it('POSITIVE: supports filtering for inactive shelters', async () => {
      shelterModel.find.mockReturnValue(makeQuery([]));

      await service.findAll(adminUser, {
        isActive: 'false',
      });

      expect(shelterModel.find).toHaveBeenCalledWith({
        isActive: false,
      });
    });

    it('NEGATIVE: rejects an invalid isActive filter', async () => {
      await expect(
        service.findAll(adminUser, {
          isActive: 'yes',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(shelterModel.find).not.toHaveBeenCalled();
    });

    
    it('POSITIVE: limits a district officer to assigned districts', async () => {
    shelterModel.find.mockReturnValue(makeQuery([]));

    await service.findAll(dutyOfficer, {});

    // POSITIVE: the query includes all assigned districts.
    // assignedDistricts are added before the user's own district.
    expect(shelterModel.find).toHaveBeenCalledWith({
        district: {
        $in: ['Galle', 'Colombo'],
        },
    });
    });


    it('NEGATIVE: prevents a district officer from bypassing district restrictions with a filter', async () => {
      await expect(
        service.findAll(dutyOfficer, {
          district: 'Kandy',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(shelterModel.find).not.toHaveBeenCalled();
    });

    it('POSITIVE: limits shelter staff to their assigned shelter IDs', async () => {
      const assignedId = new Types.ObjectId();

      const staffUser = {
        id: new Types.ObjectId().toString(),
        role: UserRole.SHELTER_STAFF,
        assignedShelterIds: [assignedId],
      };

      shelterModel.find.mockReturnValue(makeQuery([]));

      await service.findAll(staffUser, {});

      expect(shelterModel.find).toHaveBeenCalledWith({
        _id: {
          $in: [assignedId],
        },
      });
    });

    it('NEGATIVE: rejects an unauthorized role from listing shelters', async () => {
      await expect(
        service.findAll(
          {
            id: new Types.ObjectId().toString(),
            role: UserRole.VOLUNTEER,
          },
          {},
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(shelterModel.find).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // FIND ONE SHELTER
  // ============================================================

  describe('findOne', () => {
    it('POSITIVE: allows an administrator to retrieve a shelter', async () => {
      const shelter = makeShelter();

      shelterModel.findById.mockReturnValue(makeQuery(shelter));

      const result = await service.findOne(shelterId, adminUser);

      expect(shelterModel.findById).toHaveBeenCalledWith(shelterId);
      expect(result).toBe(shelter);
    });

    it('POSITIVE: allows a district officer to view a shelter in their district', async () => {
      const shelter = makeShelter({
        district: 'Colombo',
      });

      shelterModel.findById.mockReturnValue(makeQuery(shelter));

      await expect(
        service.findOne(shelterId, dutyOfficer),
      ).resolves.toBe(shelter);
    });

    it('POSITIVE: allows shelter staff to view an assigned shelter', async () => {
      const shelter = makeShelter();

      const staffUser = {
        id: new Types.ObjectId().toString(),
        role: UserRole.SHELTER_STAFF,
        assignedShelterIds: [shelter._id],
      };

      shelterModel.findById.mockReturnValue(makeQuery(shelter));

      await expect(
        service.findOne(shelterId, staffUser),
      ).resolves.toBe(shelter);
    });

    it('NEGATIVE: rejects an invalid shelter ID', async () => {
      await expect(
        service.findOne('invalid-id', adminUser),
      ).rejects.toThrow(BadRequestException);

      expect(shelterModel.findById).not.toHaveBeenCalled();
    });

    it('NEGATIVE: rejects a shelter that does not exist', async () => {
      shelterModel.findById.mockReturnValue(makeQuery(null));

      await expect(
        service.findOne(shelterId, adminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('NEGATIVE: prevents a district officer from viewing another district shelter', async () => {
      shelterModel.findById.mockReturnValue(
        makeQuery(makeShelter({ district: 'Kandy' })),
      );

      await expect(
        service.findOne(shelterId, dutyOfficer),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE: prevents shelter staff from viewing an unassigned shelter', async () => {
      const staffUser = {
        id: new Types.ObjectId().toString(),
        role: UserRole.SHELTER_STAFF,
        assignedShelterIds: [],
      };

      shelterModel.findById.mockReturnValue(
        makeQuery(makeShelter()),
      );

      await expect(
        service.findOne(shelterId, staffUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // UPDATE SHELTER
  // ============================================================

  describe('update', () => {
    it('POSITIVE: updates shelter details', async () => {
      const shelter = makeShelter();

      shelterModel.findById.mockReturnValue(makeQuery(shelter));

      const result = await service.update(
        shelterId,
        { name: 'Updated Shelter Name' } as any,
        adminUser,
      );

      expect(result.name).toBe('Updated Shelter Name');
      expect(shelter.save).toHaveBeenCalled();
    });

    it('POSITIVE: normalizes a new shelter code', async () => {
      const shelter = makeShelter();

      shelterModel.findById.mockReturnValue(makeQuery(shelter));
      shelterModel.findOne.mockResolvedValue(null);

      await service.update(
        shelterId,
        { shelterCode: ' new-002 ' } as any,
        adminUser,
      );

      expect(shelterModel.findOne).toHaveBeenCalledWith({
        shelterCode: 'NEW-002',
        _id: { $ne: shelter._id },
      });
      expect(shelter.shelterCode).toBe('NEW-002');
    });

    it('NEGATIVE: rejects an unauthorized user trying to update a shelter', async () => {
      await expect(
        service.update(
          shelterId,
          { name: 'Unauthorized Update' } as any,
          {
            id: new Types.ObjectId().toString(),
            role: UserRole.CITIZEN,
          },
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(shelterModel.findById).not.toHaveBeenCalled();
    });

    it('NEGATIVE: rejects an update with an invalid shelter ID', async () => {
      await expect(
        service.update(
          'invalid-id',
          { name: 'Updated Name' } as any,
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE: rejects a duplicate shelter code during update', async () => {
      const shelter = makeShelter();

      shelterModel.findById.mockReturnValue(makeQuery(shelter));
      shelterModel.findOne.mockResolvedValue(
        makeShelter({
          _id: new Types.ObjectId(),
          shelterCode: 'NEW-002',
        }),
      );

      await expect(
        service.update(
          shelterId,
          { shelterCode: 'new-002' } as any,
          adminUser,
        ),
      ).rejects.toThrow(ConflictException);

      expect(shelter.save).not.toHaveBeenCalled();
    });

    it('NEGATIVE: prevents a duty officer from moving a shelter to an unassigned district', async () => {
      const shelter = makeShelter({
        district: 'Colombo',
      });

      shelterModel.findById.mockReturnValue(makeQuery(shelter));

      await expect(
        service.update(
          shelterId,
          { district: 'Kandy' } as any,
          dutyOfficer,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(shelter.save).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // ACTIVATE / DEACTIVATE SHELTER
  // ============================================================

  describe('setActive', () => {
    it('POSITIVE: deactivates a shelter without deleting its record', async () => {
      const shelter = makeShelter();

      shelterModel.findById.mockReturnValue(makeQuery(shelter));

      const result = await service.setActive(
        shelterId,
        false,
        adminUser,
      );

      expect(result.isActive).toBe(false);
      expect(shelter.save).toHaveBeenCalled();
    });

    it('POSITIVE: reactivates a shelter', async () => {
      const shelter = makeShelter({
        isActive: false,
      });

      shelterModel.findById.mockReturnValue(makeQuery(shelter));

      const result = await service.setActive(
        shelterId,
        true,
        adminUser,
      );

      expect(result.isActive).toBe(true);
      expect(shelter.save).toHaveBeenCalled();
    });

    it('NEGATIVE: prevents an unauthorized user from changing shelter status', async () => {
      await expect(
        service.setActive(
          shelterId,
          false,
          {
            id: new Types.ObjectId().toString(),
            role: UserRole.CITIZEN,
          },
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(shelterModel.findById).not.toHaveBeenCalled();
    });

    it('NEGATIVE: prevents a duty officer from changing a shelter outside assigned districts', async () => {
      shelterModel.findById.mockReturnValue(
        makeQuery(makeShelter({ district: 'Kandy' })),
      );

      await expect(
        service.setActive(shelterId, false, dutyOfficer),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
