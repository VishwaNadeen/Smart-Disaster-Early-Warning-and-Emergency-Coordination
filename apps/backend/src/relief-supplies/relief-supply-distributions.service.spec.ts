import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ReliefSupplyDistributionsService } from './relief-supply-distributions.service';
import {
  ReliefSupply,
  ReliefSupplyStatus,
} from './schemas/relief-supply.schema';
import {
  ReliefSupplyDistribution,
  ReliefSupplyDistributionStatus,
} from './schemas/relief-supply-distribution.schema';
import {
  Shelter,
  ShelterOperationalStatus,
} from '../shelters/schemas/shelter.schema';
import { User, UserRole } from '../users/schemas/user.schema';

describe('ReliefSupplyDistributionsService', () => {
  let service: ReliefSupplyDistributionsService;

  let supplyModel: any;
  let distributionModel: any;
  let shelterModel: any;
  let userModel: any;

  const userId = new Types.ObjectId().toString();
  const supplyId = new Types.ObjectId().toString();
  const shelterId = new Types.ObjectId().toString();
  const distributionId = new Types.ObjectId().toString();

  const adminUser = {
    id: userId,
    role: UserRole.ADMIN,
  };

  const makeSupply = (overrides: Record<string, any> = {}) => ({
    _id: new Types.ObjectId(supplyId),
    name: 'Drinking Water',
    supplyCode: 'WATER-001',
    category: 'WATER',
    unit: 'BOTTLES',
    totalQuantity: 100,
    availableQuantity: 100,
    reservedQuantity: 0,
    minimumStockLevel: 10,
    status: ReliefSupplyStatus.AVAILABLE,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const makeShelter = (overrides: Record<string, any> = {}) => ({
    _id: new Types.ObjectId(shelterId),
    name: 'Central Shelter',
    district: 'Colombo',
    isActive: true,
    operationalStatus: ShelterOperationalStatus.OPEN,
    ...overrides,
  });

  const makeDistribution = (overrides: Record<string, any> = {}) => ({
    _id: new Types.ObjectId(distributionId),
    supplyId: new Types.ObjectId(supplyId),
    shelterId: new Types.ObjectId(shelterId),
    shelterName: 'Central Shelter',
    allocatedQuantity: 20,
    dispatchedQuantity: 0,
    deliveredQuantity: 0,
    allocatedBy: new Types.ObjectId(userId),
    status: ReliefSupplyDistributionStatus.ALLOCATED,
    notes: '',
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const makeQuery = (result: any) => ({
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    supplyModel = {
      findById: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findByIdAndUpdate: vi.fn(),
    };

    distributionModel = {
      create: vi.fn(),
      findById: vi.fn(),
      find: vi.fn(),
    };

    shelterModel = {
      findById: vi.fn(),
      find: vi.fn(),
    };

    userModel = {
      findById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReliefSupplyDistributionsService,
        {
          provide: getModelToken(ReliefSupply.name),
          useValue: supplyModel,
        },
        {
          provide: getModelToken(ReliefSupplyDistribution.name),
          useValue: distributionModel,
        },
        {
          provide: getModelToken(Shelter.name),
          useValue: shelterModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    service = module.get<ReliefSupplyDistributionsService>(
      ReliefSupplyDistributionsService,
    );
  });

  // ============================================================
  // CREATE DISTRIBUTION
  // ============================================================

  describe('create', () => {
    const dto = {
      supplyId,
      shelterId,
      allocatedQuantity: 20,
      notes: 'Urgent water allocation',
    };

    it('POSITIVE: allocates available stock to an open shelter', async () => {
      const supply = makeSupply();
      const shelter = makeShelter();

      const updatedSupply = makeSupply({
        availableQuantity: 80,
        reservedQuantity: 20,
      });

      const distribution = makeDistribution();

      supplyModel.findById.mockReturnValue(makeQuery(supply));
      shelterModel.findById.mockReturnValue(makeQuery(shelter));
      supplyModel.findOneAndUpdate.mockReturnValue(
        makeQuery(updatedSupply),
      );
      distributionModel.create.mockResolvedValue(distribution);

      const result = await service.create(dto as any, adminUser);

      expect(supplyModel.findById).toHaveBeenCalledWith(supplyId);
      expect(shelterModel.findById).toHaveBeenCalledWith(shelterId);

      expect(supplyModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: supply._id,
          status: { $ne: ReliefSupplyStatus.INACTIVE },
          availableQuantity: { $gte: 20 },
        }),
        {
          $inc: {
            availableQuantity: -20,
            reservedQuantity: 20,
          },
        },
        { new: true, runValidators: true },
      );

      expect(updatedSupply.save).toHaveBeenCalled();
      expect(distributionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          allocatedQuantity: 20,
          dispatchedQuantity: 0,
          deliveredQuantity: 0,
          status: ReliefSupplyDistributionStatus.ALLOCATED,
          notes: 'Urgent water allocation',
        }),
      );

      expect(result.remainingAvailableQuantity).toBe(80);
    });

    it('NEGATIVE: rejects a user without a management role', async () => {
      await expect(
        service.create(dto as any, {
          id: userId,
          role: UserRole.CITIZEN,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(supplyModel.findById).not.toHaveBeenCalled();
    });

    it('NEGATIVE: rejects an invalid authenticated user ID', async () => {
      await expect(
        service.create(dto as any, {
          id: 'invalid-user-id',
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('NEGATIVE: rejects a supply item that does not exist', async () => {
      supplyModel.findById.mockReturnValue(makeQuery(null));

      await expect(
        service.create(dto as any, adminUser),
      ).rejects.toThrow(NotFoundException);

      expect(shelterModel.findById).not.toHaveBeenCalled();
    });

    it('NEGATIVE: rejects an inactive supply item', async () => {
      supplyModel.findById.mockReturnValue(
        makeQuery(
          makeSupply({ status: ReliefSupplyStatus.INACTIVE }),
        ),
      );

      await expect(
        service.create(dto as any, adminUser),
      ).rejects.toThrow(BadRequestException);

      expect(shelterModel.findById).not.toHaveBeenCalled();
    });

    it('NEGATIVE: rejects a shelter that does not exist or is inactive', async () => {
      supplyModel.findById.mockReturnValue(makeQuery(makeSupply()));
      shelterModel.findById.mockReturnValue(
        makeQuery(makeShelter({ isActive: false })),
      );

      await expect(
        service.create(dto as any, adminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('NEGATIVE: rejects allocation to a closed shelter', async () => {
      supplyModel.findById.mockReturnValue(makeQuery(makeSupply()));
      shelterModel.findById.mockReturnValue(
        makeQuery(
          makeShelter({
            operationalStatus: ShelterOperationalStatus.CLOSED,
          }),
        ),
      );

      await expect(
        service.create(dto as any, adminUser),
      ).rejects.toThrow(BadRequestException);

      expect(supplyModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('NEGATIVE: rejects allocation when available stock is insufficient', async () => {
      supplyModel.findById.mockReturnValue(makeQuery(makeSupply()));
      shelterModel.findById.mockReturnValue(makeQuery(makeShelter()));
      supplyModel.findOneAndUpdate.mockReturnValue(makeQuery(null));

      await expect(
        service.create(dto as any, adminUser),
      ).rejects.toThrow(BadRequestException);

      expect(distributionModel.create).not.toHaveBeenCalled();
    });

    it('POSITIVE: allows a district officer to allocate within an assigned district', async () => {
      const districtOfficer = {
        id: userId,
        role: UserRole.DISTRICT_OFFICER,
      };

      supplyModel.findById.mockReturnValue(makeQuery(makeSupply()));
      shelterModel.findById.mockReturnValue(
        makeQuery(makeShelter({ district: 'Colombo' })),
      );

      userModel.findById.mockReturnValue(
        makeQuery({
          district: 'Colombo',
          assignedDistricts: [],
          isActive: true,
        }),
      );

      supplyModel.findOneAndUpdate.mockReturnValue(
        makeQuery(
          makeSupply({
            availableQuantity: 80,
            reservedQuantity: 20,
          }),
        ),
      );

      distributionModel.create.mockResolvedValue(makeDistribution());

      await expect(
        service.create(dto as any, districtOfficer),
      ).resolves.toBeDefined();

      expect(userModel.findById).toHaveBeenCalledWith(userId);
    });

    it('NEGATIVE: prevents a district officer from allocating outside assigned districts', async () => {
      const districtOfficer = {
        id: userId,
        role: UserRole.DISTRICT_OFFICER,
      };

      supplyModel.findById.mockReturnValue(makeQuery(makeSupply()));
      shelterModel.findById.mockReturnValue(
        makeQuery(makeShelter({ district: 'Galle' })),
      );

      userModel.findById.mockReturnValue(
        makeQuery({
          district: 'Colombo',
          assignedDistricts: [],
          isActive: true,
        }),
      );

      await expect(
        service.create(dto as any, districtOfficer),
      ).rejects.toThrow(ForbiddenException);

      expect(supplyModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('NEGATIVE: restores reserved stock if distribution creation fails', async () => {
      const originalSupply = makeSupply();
      const updatedSupply = makeSupply({
        availableQuantity: 80,
        reservedQuantity: 20,
      });
      const restoredSupply = makeSupply({
        availableQuantity: 100,
        reservedQuantity: 0,
      });

      supplyModel.findById.mockReturnValue(makeQuery(originalSupply));
      shelterModel.findById.mockReturnValue(makeQuery(makeShelter()));
      supplyModel.findOneAndUpdate.mockReturnValue(
        makeQuery(updatedSupply),
      );

      distributionModel.create.mockRejectedValue(
        new Error('Database creation failed'),
      );

      supplyModel.findByIdAndUpdate.mockReturnValue(
        makeQuery(restoredSupply),
      );

      await expect(
        service.create(dto as any, adminUser),
      ).rejects.toThrow('Database creation failed');

      expect(supplyModel.findByIdAndUpdate).toHaveBeenCalledWith(
        updatedSupply._id,
        {
          $inc: {
            availableQuantity: 20,
            reservedQuantity: -20,
          },
        },
        { new: true },
      );

      expect(restoredSupply.save).toHaveBeenCalled();
    });
  });

  // ============================================================
  // UPDATE DISTRIBUTION STATUS
  // ============================================================

  describe('updateStatus', () => {
    const dispatchedDto = {
      status: ReliefSupplyDistributionStatus.DISPATCHED,
      dispatchedQuantity: 10,
      deliveredQuantity: 0,
    };

    it('POSITIVE: dispatches allocated supplies and consumes reserved stock', async () => {
      const distribution = makeDistribution();
      const supply = makeSupply({
        availableQuantity: 80,
        reservedQuantity: 20,
        totalQuantity: 100,
      });
      const updatedSupply = makeSupply({
        availableQuantity: 80,
        reservedQuantity: 10,
        totalQuantity: 90,
      });

      distributionModel.findById.mockReturnValue(
        makeQuery(distribution),
      );
      shelterModel.findById.mockReturnValue(makeQuery(makeShelter()));
      supplyModel.findById.mockReturnValue(makeQuery(supply));
      supplyModel.findOneAndUpdate.mockReturnValue(
        makeQuery(updatedSupply),
      );

      const result = await service.updateStatus(
        distributionId,
        dispatchedDto as any,
        adminUser,
      );

      expect(supplyModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: supply._id,
          reservedQuantity: { $gte: 10 },
          totalQuantity: { $gte: 10 },
        }),
        {
          $inc: {
            reservedQuantity: -10,
            totalQuantity: -10,
          },
        },
        { new: true, runValidators: true },
      );

      expect(distribution.status).toBe(
        ReliefSupplyDistributionStatus.DISPATCHED,
      );
      expect(distribution.dispatchedQuantity).toBe(10);
      expect(distribution.save).toHaveBeenCalled();
      expect(result.distribution).toBe(distribution);
    });

    it('NEGATIVE: rejects an invalid distribution ID', async () => {
      await expect(
        service.updateStatus(
          'invalid-id',
          dispatchedDto as any,
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE: rejects a distribution that does not exist', async () => {
      distributionModel.findById.mockReturnValue(makeQuery(null));

      await expect(
        service.updateStatus(
          distributionId,
          dispatchedDto as any,
          adminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('NEGATIVE: rejects dispatch quantities greater than allocated quantity', async () => {
      const distribution = makeDistribution({
        allocatedQuantity: 20,
      });

      distributionModel.findById.mockReturnValue(
        makeQuery(distribution),
      );
      shelterModel.findById.mockReturnValue(makeQuery(makeShelter()));

      await expect(
        service.updateStatus(
          distributionId,
          {
            status: ReliefSupplyDistributionStatus.DISPATCHED,
            dispatchedQuantity: 21,
            deliveredQuantity: 0,
          } as any,
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE: rejects delivered quantity greater than dispatched quantity', async () => {
      const distribution = makeDistribution({
        dispatchedQuantity: 5,
        deliveredQuantity: 0,
      });

      distributionModel.findById.mockReturnValue(
        makeQuery(distribution),
      );
      shelterModel.findById.mockReturnValue(makeQuery(makeShelter()));

      await expect(
        service.updateStatus(
          distributionId,
          {
            status: ReliefSupplyDistributionStatus.PARTIALLY_DELIVERED,
            dispatchedQuantity: 5,
            deliveredQuantity: 6,
          } as any,
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE: rejects dispatch status when dispatched quantity is zero', async () => {
      const distribution = makeDistribution();

      distributionModel.findById.mockReturnValue(
        makeQuery(distribution),
      );
      shelterModel.findById.mockReturnValue(makeQuery(makeShelter()));

      await expect(
        service.updateStatus(
          distributionId,
          {
            status: ReliefSupplyDistributionStatus.DISPATCHED,
            dispatchedQuantity: 0,
            deliveredQuantity: 0,
          } as any,
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE: rejects cancellation after dispatch has started', async () => {
      const distribution = makeDistribution({
        dispatchedQuantity: 5,
        deliveredQuantity: 0,
        status: ReliefSupplyDistributionStatus.DISPATCHED,
      });

      distributionModel.findById.mockReturnValue(
        makeQuery(distribution),
      );
      shelterModel.findById.mockReturnValue(makeQuery(makeShelter()));

      await expect(
        service.updateStatus(
          distributionId,
          {
            status: ReliefSupplyDistributionStatus.CANCELLED,
            dispatchedQuantity: 5,
            deliveredQuantity: 0,
          } as any,
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('POSITIVE: cancels an undispatched allocation and releases reserved stock', async () => {
      const distribution = makeDistribution();
      const supply = makeSupply({
        availableQuantity: 80,
        reservedQuantity: 20,
      });
      const updatedSupply = makeSupply({
        availableQuantity: 100,
        reservedQuantity: 0,
      });

      distributionModel.findById.mockReturnValue(
        makeQuery(distribution),
      );
      shelterModel.findById.mockReturnValue(makeQuery(makeShelter()));
      supplyModel.findById.mockReturnValue(makeQuery(supply));
      supplyModel.findOneAndUpdate.mockReturnValue(
        makeQuery(updatedSupply),
      );

      await service.updateStatus(
        distributionId,
        {
          status: ReliefSupplyDistributionStatus.CANCELLED,
          dispatchedQuantity: 0,
          deliveredQuantity: 0,
        } as any,
        adminUser,
      );

      expect(supplyModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: supply._id,
          reservedQuantity: { $gte: 20 },
        }),
        {
          $inc: {
            availableQuantity: 20,
            reservedQuantity: -20,
          },
        },
        { new: true, runValidators: true },
      );

      expect(distribution.status).toBe(
        ReliefSupplyDistributionStatus.CANCELLED,
      );
    });
  });

  // ============================================================
  // FIND ALL DISTRIBUTIONS
  // ============================================================

  describe('findAll', () => {
    it('POSITIVE: allows an administrator to retrieve distributions', async () => {
      const records = [makeDistribution()];

      distributionModel.find.mockReturnValue(makeQuery(records));

      const result = await service.findAll(adminUser);

      expect(distributionModel.find).toHaveBeenCalledWith({});
      expect(result).toEqual(records);
    });

    it('NEGATIVE: prevents citizens from retrieving distributions', async () => {
      await expect(
        service.findAll({
          id: userId,
          role: UserRole.CITIZEN,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(distributionModel.find).not.toHaveBeenCalled();
    });

    it('POSITIVE: scopes district officer results to shelters in assigned districts', async () => {
      const districtOfficer = {
        id: userId,
        role: UserRole.DISTRICT_OFFICER,
      };

      const shelterObjectId = new Types.ObjectId();

      userModel.findById.mockReturnValue(
        makeQuery({
          district: 'Colombo',
          assignedDistricts: ['Galle'],
          isActive: true,
        }),
      );

      shelterModel.find.mockReturnValue(
        makeQuery([{ _id: shelterObjectId }]),
      );

      const records = [makeDistribution()];
      distributionModel.find.mockReturnValue(makeQuery(records));

      const result = await service.findAll(districtOfficer);

      expect(shelterModel.find).toHaveBeenCalledWith({
        district: { $in: ['Colombo', 'Galle'] },
      });

      expect(distributionModel.find).toHaveBeenCalledWith({
        shelterId: { $in: [shelterObjectId] },
      });

      expect(result).toEqual(records);
    });

    it('NEGATIVE: rejects an inactive district officer account', async () => {
      userModel.findById.mockReturnValue(
        makeQuery({
          district: 'Colombo',
          assignedDistricts: [],
          isActive: false,
        }),
      );

      await expect(
        service.findAll({
          id: userId,
          role: UserRole.DISTRICT_OFFICER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
