
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { ReliefSupplyRequestsService } from './relief-supply-requests.service';

import {
  ReliefSupplyRequestStatus,
} from './schemas/relief-supply-request.schema';

import {
  ReliefSupplyRequestDecision,
} from './dto/review-relief-supply-request.dto';

import { UserRole } from '../users/schemas/user.schema';

import {
  ShelterOperationalStatus,
} from '../shelters/schemas/shelter.schema';

import {
  ReliefSupplyCategory,
  ReliefSupplyUnit,
  ReliefSupplyStatus,
} from '../relief-supplies/schemas/relief-supply.schema';

describe('ReliefSupplyRequestsService - Unit Tests', () => {
  let service: ReliefSupplyRequestsService;

  // Mock dependencies. These tests do not connect to MongoDB.
  let requestModel: any;
  let shelterModel: any;
  let userModel: any;
  let supplyModel: any;
  let distributionService: any;

  const shelterId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const requestId = new Types.ObjectId().toString();

  const staffUser = {
    id: userId,
    role: UserRole.SHELTER_STAFF,
    assignedShelterIds: [new Types.ObjectId(shelterId)],
  };

  const officerUser = {
    id: new Types.ObjectId().toString(),
    role: UserRole.DUTY_OFFICER,
  };

  const createDto = {
    shelterId,
    category: ReliefSupplyCategory.WATER,
    itemName: 'Drinking Water',
    unit: ReliefSupplyUnit.BOTTLES,
    requestedQuantity: 20,
    reason: 'Emergency drinking water',
  };

  const openShelter = () => ({
    _id: new Types.ObjectId(shelterId),
    isActive: true,
    operationalStatus: ShelterOperationalStatus.OPEN,
    district: 'Colombo',
  });

  const pendingRequest = () => ({
    _id: new Types.ObjectId(requestId),
    shelterId: new Types.ObjectId(shelterId),
    requestedBy: new Types.ObjectId(userId),
    category: ReliefSupplyCategory.WATER,
    itemName: 'Drinking Water',
    unit: ReliefSupplyUnit.BOTTLES,
    requestedQuantity: 20,
    reason: 'Emergency drinking water',
    status: ReliefSupplyRequestStatus.PENDING,
    allocatedQuantity: 0,
    distributionId: null,
  });

  // Builds a mock for Mongoose query chains such as:
  // findById().exec(), find().sort().populate().exec()
  const mockQuery = (value: any) => {
    const query: any = {
      exec: vi.fn().mockResolvedValue(value),
      sort: vi.fn(),
      populate: vi.fn(),
      select: vi.fn(),
    };

    query.sort.mockReturnValue(query);
    query.populate.mockReturnValue(query);
    query.select.mockReturnValue(query);

    return query;
  };

  beforeEach(() => {
    requestModel = {
      create: vi.fn(),
      find: vi.fn(),
      findById: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn(),
    };

    shelterModel = {
      findById: vi.fn(),
      find: vi.fn(),
    };

    userModel = {};

    supplyModel = {
      findOne: vi.fn(),
    };

    distributionService = {
      create: vi.fn(),
    };

    service = new ReliefSupplyRequestsService(
      requestModel,
      shelterModel,
      userModel,
      supplyModel,
      distributionService,
    );
  });

  // =========================================================
  // POSITIVE TEST CASES - CREATE REQUEST
  // =========================================================

  // POSITIVE: assigned staff can create a request for an open shelter.
  it('POSITIVE: creates a pending request for an open shelter', async () => {
    shelterModel.findById.mockReturnValue(mockQuery(openShelter()));

    const savedRequest = {
      ...pendingRequest(),
    };

    requestModel.create.mockResolvedValue(savedRequest);

    const result = await service.createRequest(staffUser, {
      ...createDto,
      itemName: ' Drinking Water ',
      reason: ' Emergency drinking water ',
    });

    expect(requestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shelterId: expect.any(Types.ObjectId),
        requestedBy: expect.any(Types.ObjectId),
        category: ReliefSupplyCategory.WATER,
        itemName: 'Drinking Water',
        unit: ReliefSupplyUnit.BOTTLES,
        requestedQuantity: 20,
        reason: 'Emergency drinking water',
        status: ReliefSupplyRequestStatus.PENDING,
        allocatedQuantity: 0,
        distributionId: null,
      }),
    );

    expect(result).toEqual(savedRequest);
  });

  // =========================================================
  // NEGATIVE TEST CASES - CREATE REQUEST
  // =========================================================

  // NEGATIVE: citizens cannot create shelter supply requests.
  it('NEGATIVE: rejects a user who is not shelter staff', async () => {
    await expect(
      service.createRequest(
        { ...staffUser, role: UserRole.CITIZEN },
        createDto,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(shelterModel.findById).not.toHaveBeenCalled();
    expect(requestModel.create).not.toHaveBeenCalled();
  });

  // NEGATIVE: staff cannot request supplies for an unassigned shelter.
  it('NEGATIVE: rejects a request for an unassigned shelter', async () => {
    await expect(
      service.createRequest(
        { ...staffUser, assignedShelterIds: [] },
        createDto,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(shelterModel.findById).not.toHaveBeenCalled();
    expect(requestModel.create).not.toHaveBeenCalled();
  });

  // NEGATIVE: shelter ID must be a valid MongoDB ObjectId.
  it('NEGATIVE: rejects an invalid shelter ID', async () => {
    await expect(
      service.createRequest(
        staffUser,
        { ...createDto, shelterId: 'invalid-id' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(shelterModel.findById).not.toHaveBeenCalled();
    expect(requestModel.create).not.toHaveBeenCalled();
  });

  // NEGATIVE: a shelter that does not exist cannot receive a request.
  it('NEGATIVE: rejects a request when the shelter does not exist', async () => {
    shelterModel.findById.mockReturnValue(mockQuery(null));

    await expect(
      service.createRequest(staffUser, createDto),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(requestModel.create).not.toHaveBeenCalled();
  });

  // NEGATIVE: an inactive shelter cannot receive a request.
  it('NEGATIVE: rejects a request for an inactive shelter', async () => {
    shelterModel.findById.mockReturnValue(
      mockQuery({
        ...openShelter(),
        isActive: false,
      }),
    );

    await expect(
      service.createRequest(staffUser, createDto),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(requestModel.create).not.toHaveBeenCalled();
  });

  // NEGATIVE: requests are only permitted for open shelters.
  it('NEGATIVE: rejects a request for a closed shelter', async () => {
    shelterModel.findById.mockReturnValue(
      mockQuery({
        ...openShelter(),
        operationalStatus: ShelterOperationalStatus.CLOSED,
      }),
    );

    await expect(
      service.createRequest(staffUser, createDto),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(requestModel.create).not.toHaveBeenCalled();
  });

  // =========================================================
  // POSITIVE TEST CASES - GET MY REQUESTS
  // =========================================================

  // POSITIVE: assigned shelter staff can retrieve their requests.
  it('POSITIVE: retrieves requests for assigned shelters', async () => {
    const requests = [pendingRequest()];
    const query = mockQuery(requests);

    requestModel.find.mockReturnValue(query);

    const result = await service.getMyRequests(staffUser);

    expect(requestModel.find).toHaveBeenCalledWith({
      shelterId: {
        $in: [new Types.ObjectId(shelterId)],
      },
    });

    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(query.populate).toHaveBeenCalledWith(
      'shelterId',
      'name shelterCode district',
    );
    expect(query.populate).toHaveBeenCalledWith('distributionId');
    expect(result).toEqual(requests);
  });

  // =========================================================
  // NEGATIVE TEST CASES - GET MY REQUESTS
  // =========================================================

  // NEGATIVE: a citizen cannot retrieve shelter staff requests.
  it('NEGATIVE: rejects an unauthorized user retrieving their requests', async () => {
    await expect(
      service.getMyRequests({
        ...staffUser,
        role: UserRole.CITIZEN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(requestModel.find).not.toHaveBeenCalled();
  });

  // NEGATIVE: staff must have at least one assigned shelter.
  it('NEGATIVE: rejects staff with no assigned shelters', async () => {
    await expect(
      service.getMyRequests({
        ...staffUser,
        assignedShelterIds: [],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(requestModel.find).not.toHaveBeenCalled();
  });

  // =========================================================
  // POSITIVE TEST CASES - GET OFFICER REQUESTS
  // =========================================================

  // POSITIVE: an authorized duty officer can retrieve pending requests.
  it('POSITIVE: retrieves pending requests for a duty officer', async () => {
    const requests = [pendingRequest()];
    const query = mockQuery(requests);

    requestModel.find.mockReturnValue(query);

    const result = await service.getOfficerRequests(officerUser);

    expect(requestModel.find).toHaveBeenCalledWith({
      status: ReliefSupplyRequestStatus.PENDING,
    });

    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(query.populate).toHaveBeenCalledWith(
      'shelterId',
      'name shelterCode district',
    );
    expect(query.populate).toHaveBeenCalledWith(
      'requestedBy',
      'fullName email',
    );
    expect(result).toEqual(requests);
  });

  // POSITIVE: district officers can filter requests to their districts.
  it('POSITIVE: filters district officer requests to assigned districts', async () => {
    const query = mockQuery([
      {
        _id: new Types.ObjectId(),
        district: 'Colombo',
      },
    ]);

    shelterModel.find.mockReturnValue(
      mockQuery([
        {
          _id: new Types.ObjectId(shelterId),
          district: 'Colombo',
        },
        {
          _id: new Types.ObjectId(),
          district: 'Galle',
        },
      ]),
    );

    const districtOfficer = {
      id: new Types.ObjectId().toString(),
      role: UserRole.DISTRICT_OFFICER,
      assignedDistricts: [' Colombo '],
    };

    requestModel.find.mockReturnValue(query);

    await service.getOfficerRequests(districtOfficer);

    expect(requestModel.find).toHaveBeenCalledWith({
      status: ReliefSupplyRequestStatus.PENDING,
      shelterId: {
        $in: [expect.any(Types.ObjectId)],
      },
    });

    expect(shelterModel.find).toHaveBeenCalledWith({
      isActive: true,
    });
  });

  // =========================================================
  // NEGATIVE TEST CASES - GET OFFICER REQUESTS
  // =========================================================

  // NEGATIVE: shelter staff cannot access the officer request listing.
  it('NEGATIVE: rejects an unauthorized role accessing officer requests', async () => {
    await expect(
      service.getOfficerRequests(staffUser),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(requestModel.find).not.toHaveBeenCalled();
  });

  // NEGATIVE: district officers need an assigned district.
  it('NEGATIVE: rejects a district officer without an assigned district', async () => {
    await expect(
      service.getOfficerRequests({
        id: new Types.ObjectId().toString(),
        role: UserRole.DISTRICT_OFFICER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(shelterModel.find).not.toHaveBeenCalled();
    expect(requestModel.find).not.toHaveBeenCalled();
  });

  // =========================================================
  // NEGATIVE TEST CASES - REVIEW REQUEST
  // =========================================================

  // NEGATIVE: invalid request IDs must be rejected.
  it('NEGATIVE: rejects an invalid request ID', async () => {
    await expect(
      service.reviewRequest(
        officerUser,
        'invalid-id',
        { decision: ReliefSupplyRequestDecision.REJECTED },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(requestModel.findById).not.toHaveBeenCalled();
  });

  // NEGATIVE: reviewing a request that does not exist must fail.
  it('NEGATIVE: rejects a request that does not exist', async () => {
    requestModel.findById.mockReturnValue(mockQuery(null));

    await expect(
      service.reviewRequest(
        officerUser,
        requestId,
        { decision: ReliefSupplyRequestDecision.REJECTED },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // NEGATIVE: only pending requests may be reviewed.
  it('NEGATIVE: rejects a request that has already been reviewed', async () => {
    requestModel.findById.mockReturnValue(
      mockQuery({
        ...pendingRequest(),
        status: ReliefSupplyRequestStatus.REJECTED,
      }),
    );

    await expect(
      service.reviewRequest(
        officerUser,
        requestId,
        { decision: ReliefSupplyRequestDecision.REJECTED },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(requestModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  // NEGATIVE: an officer cannot review a request for a missing shelter.
  it('NEGATIVE: rejects review when the shelter does not exist', async () => {
    requestModel.findById.mockReturnValue(
      mockQuery(pendingRequest()),
    );
    shelterModel.findById.mockReturnValue(mockQuery(null));

    await expect(
      service.reviewRequest(
        officerUser,
        requestId,
        { decision: ReliefSupplyRequestDecision.REJECTED },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(requestModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  // NEGATIVE: district officers cannot review requests outside their districts.
  it('NEGATIVE: rejects a district officer reviewing another district', async () => {
    requestModel.findById.mockReturnValue(
      mockQuery(pendingRequest()),
    );
    shelterModel.findById.mockReturnValue(
      mockQuery({
        ...openShelter(),
        district: 'Galle',
      }),
    );

    await expect(
      service.reviewRequest(
        {
          id: new Types.ObjectId().toString(),
          role: UserRole.DISTRICT_OFFICER,
          assignedDistricts: ['Colombo'],
        },
        requestId,
        { decision: ReliefSupplyRequestDecision.REJECTED },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(requestModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  // =========================================================
  // POSITIVE TEST CASES - REVIEW REQUEST
  // =========================================================

  // POSITIVE: an officer can reject a pending request.
  // Rejection must not change supply inventory.
  it('POSITIVE: rejects a pending request successfully', async () => {
    const rejectedRequest = {
      ...pendingRequest(),
      status: ReliefSupplyRequestStatus.REJECTED,
    };

    requestModel.findById.mockReturnValue(
      mockQuery(pendingRequest()),
    );
    shelterModel.findById.mockReturnValue(
      mockQuery(openShelter()),
    );
    requestModel.findOneAndUpdate.mockReturnValue(
      mockQuery(rejectedRequest),
    );

    const result = await service.reviewRequest(
      officerUser,
      requestId,
      {
        decision: ReliefSupplyRequestDecision.REJECTED,
        decisionNotes: ' Insufficient justification ',
      },
    );

    expect(requestModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(Types.ObjectId),
        status: ReliefSupplyRequestStatus.PENDING,
      }),
      {
        $set: expect.objectContaining({
          status: ReliefSupplyRequestStatus.REJECTED,
          decisionNotes: 'Insufficient justification',
        }),
      },
      { new: true, runValidators: true },
    );

    expect(supplyModel.findOne).not.toHaveBeenCalled();
    expect(distributionService.create).not.toHaveBeenCalled();
    expect(result).toEqual(rejectedRequest);
  });

  // POSITIVE: an officer can approve a request when stock is available.
  it('POSITIVE: approves a request and allocates available stock', async () => {
    const request = pendingRequest();

    const claimedRequest = {
      ...request,
      status: ReliefSupplyRequestStatus.APPROVED,
    };

    const allocatedRequest = {
      ...claimedRequest,
      status: ReliefSupplyRequestStatus.ALLOCATED,
      allocatedQuantity: 20,
      distributionId: new Types.ObjectId(),
    };

    const supplyId = new Types.ObjectId();
    const distributionId = new Types.ObjectId();

    requestModel.findById.mockReturnValue(mockQuery(request));
    shelterModel.findById.mockReturnValue(
      mockQuery(openShelter()),
    );

    // First update claims the pending request.
    // Second update saves the completed allocation.
    requestModel.findOneAndUpdate
      .mockReturnValueOnce(mockQuery(claimedRequest))
      .mockReturnValueOnce(mockQuery(allocatedRequest));

    supplyModel.findOne.mockReturnValue(
      mockQuery({
        _id: supplyId,
        name: 'Drinking Water',
        category: ReliefSupplyCategory.WATER,
        unit: ReliefSupplyUnit.BOTTLES,
        status: ReliefSupplyStatus.AVAILABLE,        availableQuantity: 100,
      }),
    );

    distributionService.create.mockResolvedValue({
      distribution: {
        _id: distributionId,
      },
    });

    const result = await service.reviewRequest(
      officerUser,
      requestId,
      {
        decision: ReliefSupplyRequestDecision.APPROVED,
        decisionNotes: 'Approved for emergency use',
      },
    );

    expect(supplyModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        category: ReliefSupplyCategory.WATER,
        unit: ReliefSupplyUnit.BOTTLES,
        status: {
          $ne: ReliefSupplyStatus.INACTIVE,
        },
      }),
    );

    expect(distributionService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        supplyId: supplyId.toString(),
        shelterId: shelterId,
        allocatedQuantity: 20,
      }),
      {
        id: officerUser.id,
        role: officerUser.role,
      },
    );

    expect(result).toEqual(allocatedRequest);
  });
});
