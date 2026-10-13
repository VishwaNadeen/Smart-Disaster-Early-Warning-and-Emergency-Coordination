
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { ReliefSuppliesService } from './relief-supplies.service';

import {
  ReliefSupplyCategory,
  ReliefSupplyStatus,
  ReliefSupplyUnit,
} from './schemas/relief-supply.schema';

import { UserRole } from '../users/schemas/user.schema';

describe('ReliefSuppliesService - Unit Tests', () => {
  let service: ReliefSuppliesService;
  let reliefSupplyModel: any;

  const adminUser = {
    id: 'admin-test-id',
    role: UserRole.ADMIN,
  };

  const citizenUser = {
    id: 'citizen-test-id',
    role: UserRole.CITIZEN,
  };

  const createDto = {
    name: 'Drinking Water',
    supplyCode: 'WAT-001',
    category: ReliefSupplyCategory.WATER,
    unit: ReliefSupplyUnit.BOTTLES,
    totalQuantity: 100,
    minimumStockLevel: 10,
    storageLocation: 'Central Warehouse',
    description: 'Emergency drinking water',
  };

  const makeSupply = (overrides: Record<string, any> = {}) => ({
    _id: 'supply-test-id',
    ...createDto,
    totalQuantity: 100,
    availableQuantity: 100,
    reservedQuantity: 0,
    minimumStockLevel: 10,
    status: ReliefSupplyStatus.AVAILABLE,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const makeQuery = (result: any) => {
    const query: any = {
      exec: vi.fn().mockResolvedValue(result),
      sort: vi.fn(),
    };

    query.sort.mockReturnValue(query);
    return query;
  };

  beforeEach(() => {
    reliefSupplyModel = {
      findOne: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findById: vi.fn(),
    };

    service = new ReliefSuppliesService(reliefSupplyModel);
  });

  // =========================================================
  // POSITIVE TEST CASES - CREATE
  // =========================================================

  // POSITIVE: authorized administrator can register a supply.
  it('POSITIVE: creates a relief supply successfully', async () => {
    reliefSupplyModel.findOne.mockResolvedValue(null);

    const savedSupply = makeSupply();
    reliefSupplyModel.create.mockResolvedValue(savedSupply);

    const result = await service.create(createDto, adminUser);

    expect(reliefSupplyModel.findOne).toHaveBeenCalledWith({
      supplyCode: 'WAT-001',
    });

    expect(reliefSupplyModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ...createDto,
        supplyCode: 'WAT-001',
        availableQuantity: 100,
        reservedQuantity: 0,
        status: ReliefSupplyStatus.AVAILABLE,
      }),
    );

    expect(result).toEqual(savedSupply);
  });

  // POSITIVE: supply codes are trimmed and converted to uppercase.
  it('POSITIVE: normalizes the supply code', async () => {
    reliefSupplyModel.findOne.mockResolvedValue(null);
    reliefSupplyModel.create.mockResolvedValue({});

    await service.create(
      { ...createDto, supplyCode: ' wat-001 ' },
      adminUser,
    );

    expect(reliefSupplyModel.findOne).toHaveBeenCalledWith({
      supplyCode: 'WAT-001',
    });

    expect(reliefSupplyModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        supplyCode: 'WAT-001',
      }),
    );
  });

  // POSITIVE: omitted minimum stock level defaults to 10.
  it('POSITIVE: applies the default minimum stock level', async () => {
    reliefSupplyModel.findOne.mockResolvedValue(null);
    reliefSupplyModel.create.mockResolvedValue({});

    const { minimumStockLevel, ...dtoWithoutMinimum } = createDto;

    await service.create(dtoWithoutMinimum, adminUser);

    expect(reliefSupplyModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        minimumStockLevel: 10,
      }),
    );
  });

  // POSITIVE: zero stock is saved with OUT_OF_STOCK status.
  it('POSITIVE: creates a supply with OUT_OF_STOCK status when quantity is zero', async () => {
    reliefSupplyModel.findOne.mockResolvedValue(null);
    reliefSupplyModel.create.mockResolvedValue({});

    await service.create(
      {
        ...createDto,
        totalQuantity: 0,
        minimumStockLevel: 10,
      },
      adminUser,
    );

    expect(reliefSupplyModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        totalQuantity: 0,
        availableQuantity: 0,
        status: ReliefSupplyStatus.OUT_OF_STOCK,
      }),
    );
  });

  // POSITIVE: stock at or below the minimum is marked LOW_STOCK.
  it('POSITIVE: creates a supply with LOW_STOCK status', async () => {
    reliefSupplyModel.findOne.mockResolvedValue(null);
    reliefSupplyModel.create.mockResolvedValue({});

    await service.create(
      {
        ...createDto,
        totalQuantity: 5,
        minimumStockLevel: 10,
      },
      adminUser,
    );

    expect(reliefSupplyModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        totalQuantity: 5,
        availableQuantity: 5,
        status: ReliefSupplyStatus.LOW_STOCK,
      }),
    );
  });

  // =========================================================
  // NEGATIVE TEST CASES - CREATE
  // =========================================================

  // NEGATIVE: citizens cannot manage central inventory.
  it('NEGATIVE: rejects an unauthorized user creating a supply', async () => {
    await expect(
      service.create(createDto, citizenUser),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(reliefSupplyModel.findOne).not.toHaveBeenCalled();
    expect(reliefSupplyModel.create).not.toHaveBeenCalled();
  });

  // NEGATIVE: duplicate supply codes are not permitted.
  it('NEGATIVE: rejects a duplicate supply code', async () => {
    reliefSupplyModel.findOne.mockResolvedValue(makeSupply());

    await expect(
      service.create(createDto, adminUser),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(reliefSupplyModel.create).not.toHaveBeenCalled();
  });

  // =========================================================
  // POSITIVE TEST CASES - FIND ALL
  // =========================================================

  // POSITIVE: authorized users can retrieve all inventory.
  it('POSITIVE: retrieves inventory without filters', async () => {
    const supplies = [makeSupply()];
    const query = makeQuery(supplies);

    reliefSupplyModel.find.mockReturnValue(query);

    const result = await service.findAll(adminUser);

    expect(reliefSupplyModel.find).toHaveBeenCalledWith({});
    expect(query.sort).toHaveBeenCalledWith({ name: 1 });
    expect(result).toEqual(supplies);
  });


  // POSITIVE: search, category, and status filters are applied.
  it('POSITIVE: filters inventory by search, category, and status', async () => {
    const query = makeQuery([]);
    reliefSupplyModel.find.mockReturnValue(query);

    await service.findAll(adminUser, {
      search: ' water ',
      category: ReliefSupplyCategory.WATER,
      status: ReliefSupplyStatus.AVAILABLE,
    });

    expect(reliefSupplyModel.find).toHaveBeenCalledWith({
      $or: [
        { name: expect.any(RegExp) },
        { supplyCode: expect.any(RegExp) },
      ],
      category: ReliefSupplyCategory.WATER,
      status: ReliefSupplyStatus.AVAILABLE,
    });

    const actualQuery = reliefSupplyModel.find.mock.calls[0][0];

    // Confirm the search term was trimmed and matches case-insensitively.
    expect(actualQuery.$or[0].name.source).toBe('water');
    expect(actualQuery.$or[0].name.flags).toContain('i');
    expect(actualQuery.$or[0].name.test('water bottles')).toBe(true);
    expect(actualQuery.$or[0].name.test('Drinking Water')).toBe(true);
  });


  // POSITIVE: search input is escaped before building regular expressions.
  it('POSITIVE: treats search special characters literally', async () => {
    reliefSupplyModel.find.mockReturnValue(makeQuery([]));

    await service.findAll(adminUser, {
      search: 'WAT.*',
    });

    const actualQuery = reliefSupplyModel.find.mock.calls[0][0];

    expect(actualQuery.$or[0].name.test('WAT.*')).toBe(true);
    expect(actualQuery.$or[0].name.test('WATxxx')).toBe(false);
  });

  // =========================================================
  // NEGATIVE TEST CASES - FIND ALL
  // =========================================================

  // NEGATIVE: citizens cannot view the central inventory.
  it('NEGATIVE: rejects an unauthorized user viewing inventory', async () => {
    await expect(
      service.findAll(citizenUser),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(reliefSupplyModel.find).not.toHaveBeenCalled();
  });

  // =========================================================
  // POSITIVE TEST CASES - FIND ONE
  // =========================================================

  // POSITIVE: returns the requested supply when it exists.
  it('POSITIVE: retrieves a supply by ID', async () => {
    const supply = makeSupply();

    reliefSupplyModel.findById.mockReturnValue(makeQuery(supply));

    const result = await service.findOne('supply-test-id', adminUser);

    expect(reliefSupplyModel.findById).toHaveBeenCalledWith(
      'supply-test-id',
    );
    expect(result).toEqual(supply);
  });

  // =========================================================
  // NEGATIVE TEST CASES - FIND ONE
  // =========================================================

  // NEGATIVE: unauthorized users cannot view individual supplies.
  it('NEGATIVE: rejects an unauthorized user retrieving a supply', async () => {
    await expect(
      service.findOne('supply-test-id', citizenUser),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(reliefSupplyModel.findById).not.toHaveBeenCalled();
  });

  // NEGATIVE: a missing supply ID returns NotFoundException.
  it('NEGATIVE: rejects a supply that does not exist', async () => {
    reliefSupplyModel.findById.mockReturnValue(makeQuery(null));

    await expect(
      service.findOne('missing-supply-id', adminUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // =========================================================
  // POSITIVE TEST CASES - ADD STOCK
  // =========================================================

  // POSITIVE: adding stock updates quantities and saves the supply.
  it('POSITIVE: adds stock and updates inventory quantities', async () => {
    const supply = makeSupply({
      totalQuantity: 100,
      availableQuantity: 80,
      minimumStockLevel: 10,
      status: ReliefSupplyStatus.AVAILABLE,
    });

    reliefSupplyModel.findById.mockReturnValue(makeQuery(supply));

    const result = await service.addStock(
      'supply-test-id',
      { quantity: 20, reason: 'New delivery received' },
      adminUser,
    );

    expect(supply.totalQuantity).toBe(120);
    expect(supply.availableQuantity).toBe(100);
    expect(supply.status).toBe(ReliefSupplyStatus.AVAILABLE);
    expect(supply.save).toHaveBeenCalledOnce();

    expect(result).toEqual({
      message: 'Relief supply stock updated successfully.',
      reason: 'New delivery received',
      supply,
    });
  });

  // POSITIVE: stock status changes from OUT_OF_STOCK to AVAILABLE.
  it('POSITIVE: changes status to AVAILABLE after restocking', async () => {
    const supply = makeSupply({
      totalQuantity: 0,
      availableQuantity: 0,
      minimumStockLevel: 10,
      status: ReliefSupplyStatus.OUT_OF_STOCK,
    });

    reliefSupplyModel.findById.mockReturnValue(makeQuery(supply));

    await service.addStock(
      'supply-test-id',
      { quantity: 20, reason: 'Restocking' },
      adminUser,
    );

    expect(supply.status).toBe(ReliefSupplyStatus.AVAILABLE);
    expect(supply.availableQuantity).toBe(20);
  });

  // POSITIVE: adding stock that remains at the minimum results in LOW_STOCK.
  it('POSITIVE: updates status to LOW_STOCK when stock equals the minimum', async () => {
    const supply = makeSupply({
      totalQuantity: 5,
      availableQuantity: 5,
      minimumStockLevel: 10,
      status: ReliefSupplyStatus.LOW_STOCK,
    });

    reliefSupplyModel.findById.mockReturnValue(makeQuery(supply));

    await service.addStock(
      'supply-test-id',
      { quantity: 5, reason: 'Small restock' },
      adminUser,
    );

    expect(supply.availableQuantity).toBe(10);
    expect(supply.status).toBe(ReliefSupplyStatus.LOW_STOCK);
  });

  // =========================================================
  // NEGATIVE TEST CASES - ADD STOCK
  // =========================================================

  // NEGATIVE: unauthorized users cannot add stock.
  it('NEGATIVE: rejects an unauthorized user adding stock', async () => {
    await expect(
      service.addStock(
        'supply-test-id',
        { quantity: 10, reason: 'Restock' },
        citizenUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(reliefSupplyModel.findById).not.toHaveBeenCalled();
  });

  // NEGATIVE: zero quantity is rejected by the service.
  it('NEGATIVE: rejects adding zero stock', async () => {
    await expect(
      service.addStock(
        'supply-test-id',
        { quantity: 0, reason: 'Restock' },
        adminUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(reliefSupplyModel.findById).not.toHaveBeenCalled();
  });

  // NEGATIVE: negative quantity is rejected by the service.
  it('NEGATIVE: rejects adding a negative quantity', async () => {
    await expect(
      service.addStock(
        'supply-test-id',
        { quantity: -5, reason: 'Incorrect stock entry' },
        adminUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(reliefSupplyModel.findById).not.toHaveBeenCalled();
  });

  // NEGATIVE: stock cannot be added to a missing supply.
  it('NEGATIVE: rejects adding stock to a missing supply', async () => {
    reliefSupplyModel.findById.mockReturnValue(makeQuery(null));

    await expect(
      service.addStock(
        'missing-supply-id',
        { quantity: 10, reason: 'Restock' },
        adminUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // NEGATIVE: inactive supply items cannot receive new stock.
  it('NEGATIVE: rejects adding stock to an inactive supply', async () => {
    const supply = makeSupply({
      status: ReliefSupplyStatus.INACTIVE,
    });

    reliefSupplyModel.findById.mockReturnValue(makeQuery(supply));

    await expect(
      service.addStock(
        'supply-test-id',
        { quantity: 10, reason: 'Restock' },
        adminUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(supply.save).not.toHaveBeenCalled();
  });
});
