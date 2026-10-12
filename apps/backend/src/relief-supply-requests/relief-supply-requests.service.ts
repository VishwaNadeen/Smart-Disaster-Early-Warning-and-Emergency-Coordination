
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ReliefSupplyRequest,
  ReliefSupplyRequestDocument,
  ReliefSupplyRequestStatus,
} from './schemas/relief-supply-request.schema';

import { CreateReliefSupplyRequestDto } from './dto/create-relief-supply-request.dto';

import {
  ReliefSupplyRequestDecision,
  ReviewReliefSupplyRequestDto,
} from './dto/review-relief-supply-request.dto';

import {
  User,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';

import {
  Shelter,
  ShelterDocument,
  ShelterOperationalStatus,
} from '../shelters/schemas/shelter.schema';

import {
  ReliefSupply,
  ReliefSupplyDocument,
  ReliefSupplyStatus,
} from '../relief-supplies/schemas/relief-supply.schema';

import { ReliefSupplyDistributionsService } from '../relief-supplies/relief-supply-distributions.service';

interface AuthenticatedUser {
  id: string;
  role: UserRole;
  district?: string;
  assignedDistricts?: string[];
  assignedShelterIds?: UserDocument['assignedShelterIds'];
}

const SHELTER_STAFF_ROLES: UserRole[] = [
  UserRole.SHELTER_STAFF,
];

const DMC_ROLES: UserRole[] = [
  UserRole.DUTY_OFFICER,
  UserRole.DISTRICT_OFFICER,
  UserRole.ADMIN,
  UserRole.SYSTEM_ADMIN,
];

@Injectable()
export class ReliefSupplyRequestsService {
  constructor(
    @InjectModel(ReliefSupplyRequest.name)
    private readonly requestModel: Model<ReliefSupplyRequestDocument>,

    @InjectModel(Shelter.name)
    private readonly shelterModel: Model<ShelterDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(ReliefSupply.name)
    private readonly supplyModel: Model<ReliefSupplyDocument>,

    private readonly distributionService: ReliefSupplyDistributionsService,
  ) {}

  // Shelter staff create requests for their assigned shelters.
  async createRequest(
    user: AuthenticatedUser,
    dto: CreateReliefSupplyRequestDto,
  ) {
    this.ensureRole(user, SHELTER_STAFF_ROLES);

    const shelterId = this.validateObjectId(dto.shelterId);

    const assignedShelterIds = (user.assignedShelterIds ?? []).map(
      (id) => id.toString(),
    );

    if (!assignedShelterIds.includes(shelterId.toString())) {
      throw new ForbiddenException(
        'You are not assigned to this shelter.',
      );
    }

    const shelter = await this.shelterModel
      .findById(shelterId)
      .exec();

    if (!shelter || !shelter.isActive) {
      throw new NotFoundException(
        'The assigned shelter was not found or is inactive.',
      );
    }

    if (
      shelter.operationalStatus !== ShelterOperationalStatus.OPEN
    ) {
      throw new BadRequestException(
        'Supply requests can only be submitted for open shelters.',
      );
    }

    return this.requestModel.create({
      shelterId,
      requestedBy: new Types.ObjectId(user.id),
      category: dto.category,
      itemName: dto.itemName.trim(),
      unit: dto.unit,
      requestedQuantity: dto.requestedQuantity,
      reason: dto.reason.trim(),
      status: ReliefSupplyRequestStatus.PENDING,
      allocatedQuantity: 0,
      distributionId: null,
    });
  }

  // Shelter staff can view requests for their assigned shelters.
  async getMyRequests(user: AuthenticatedUser) {
    this.ensureRole(user, SHELTER_STAFF_ROLES);

    const assignedShelterIds = (user.assignedShelterIds ?? [])
      .map((id) => id.toString())
      .filter((id) => Types.ObjectId.isValid(id));

    if (assignedShelterIds.length === 0) {
      throw new ForbiddenException(
        'No shelters are assigned to your account.',
      );
    }

    return this.requestModel
      .find({
        shelterId: {
          $in: assignedShelterIds.map(
            (id) => new Types.ObjectId(id),
          ),
        },
      })
      .sort({ createdAt: -1 })
      .populate('shelterId', 'name shelterCode district')
      .populate('distributionId')
      .exec();
  }

  // DMC officers see pending requests within their authorized scope.
  async getOfficerRequests(user: AuthenticatedUser) {
    this.ensureRole(user, DMC_ROLES);

    const filter: Record<string, unknown> = {
      status: ReliefSupplyRequestStatus.PENDING,
    };

    if (user.role === UserRole.DISTRICT_OFFICER) {
      const districts = this.getOfficerDistricts(user).map(
        (district) => district.toLowerCase(),
      );

      const shelters = await this.shelterModel
        .find({ isActive: true })
        .select('_id district')
        .exec();

      const permittedShelterIds = shelters
        .filter((shelter) =>
          districts.includes(shelter.district.trim().toLowerCase()),
        )
        .map((shelter) => shelter._id);

      filter.shelterId = { $in: permittedShelterIds };
    }

    return this.requestModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('shelterId', 'name shelterCode district')
      .populate('requestedBy', 'fullName email')
      .exec();
  }

  // DMC officers approve or reject pending requests.
  async reviewRequest(
    user: AuthenticatedUser,
    requestId: string,
    dto: ReviewReliefSupplyRequestDto,
  ) {
    this.ensureRole(user, DMC_ROLES);

    const id = this.validateObjectId(requestId);

    if (!Types.ObjectId.isValid(user.id)) {
      throw new ForbiddenException(
        'The authenticated user ID is invalid.',
      );
    }

    const request = await this.requestModel
      .findById(id)
      .exec();

    if (!request) {
      throw new NotFoundException(
        'Relief supply request not found.',
      );
    }

    if (request.status !== ReliefSupplyRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending requests can be reviewed.',
      );
    }

    const shelter = await this.shelterModel
      .findById(request.shelterId)
      .exec();

    if (!shelter || !shelter.isActive) {
      throw new BadRequestException(
        'The requested shelter is missing or inactive.',
      );
    }

    // District officers can only review requests in their assigned districts.
    if (user.role === UserRole.DISTRICT_OFFICER) {
      const districts = this.getOfficerDistricts(user).map(
        (district) => district.toLowerCase(),
      );

      if (
        !districts.includes(shelter.district.trim().toLowerCase())
      ) {
        throw new ForbiddenException(
          'You are not authorized to review requests for this district.',
        );
      }
    }

    const reviewFields = {
      reviewedBy: new Types.ObjectId(user.id),
      reviewedAt: new Date(),
      decisionNotes: dto.decisionNotes?.trim() ?? '',
    };

    // Rejection does not modify inventory.
    if (dto.decision === ReliefSupplyRequestDecision.REJECTED) {
      const rejected = await this.requestModel
        .findOneAndUpdate(
          {
            _id: id,
            status: ReliefSupplyRequestStatus.PENDING,
          },
          {
            $set: {
              ...reviewFields,
              status: ReliefSupplyRequestStatus.REJECTED,
            },
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!rejected) {
        throw new BadRequestException(
          'This request has already been reviewed.',
        );
      }

      return rejected;
    }

    // Claim the request atomically before allocating stock.
    const claimed = await this.requestModel
      .findOneAndUpdate(
        {
          _id: id,
          status: ReliefSupplyRequestStatus.PENDING,
        },
        {
          $set: {
            ...reviewFields,
            status: ReliefSupplyRequestStatus.APPROVED,
          },
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!claimed) {
      throw new BadRequestException(
        'This request has already been reviewed.',
      );
    }

    let distributionCreated = false;

    try {
      if (
        shelter.operationalStatus !== ShelterOperationalStatus.OPEN
      ) {
        throw new BadRequestException(
          'Supplies can only be allocated to open shelters.',
        );
      }

      // Match the name without case sensitivity, plus exact category and unit.
      const escapedName = request.itemName.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

      const supply = await this.supplyModel
        .findOne({
          name: {
            $regex: `^${escapedName}$`,
            $options: 'i',
          },
          category: request.category,
          unit: request.unit,
          status: { $ne: ReliefSupplyStatus.INACTIVE },
        })
        .exec();

      if (!supply) {
        throw new BadRequestException(
          'No active inventory item matches this request name, category and unit.',
        );
      }

      if (
        supply.availableQuantity < request.requestedQuantity
      ) {
        throw new BadRequestException(
          `Insufficient stock. Requested: ${request.requestedQuantity}; available: ${supply.availableQuantity}.`,
        );
      }

      // Reuse the existing service that atomically reserves stock
      // and creates a distribution record.
      const allocation = await this.distributionService.create(
        {
          supplyId: supply._id.toString(),
          shelterId: shelter._id.toString(),
          allocatedQuantity: request.requestedQuantity,
          notes: `Allocated for shelter supply request ${request._id}. ${request.reason}`,
        },
        {
          id: user.id,
          role: user.role,
        },
      );

      distributionCreated = true;

      const updatedRequest = await this.requestModel
        .findOneAndUpdate(
          {
            _id: id,
            status: ReliefSupplyRequestStatus.APPROVED,
          },
          {
            $set: {
              status: ReliefSupplyRequestStatus.ALLOCATED,
              distributionId: allocation.distribution._id,
              allocatedQuantity: request.requestedQuantity,
            },
          },
          { new: true, runValidators: true },
        )
        .populate('distributionId')
        .exec();

      if (!updatedRequest) {
        throw new BadRequestException(
          'The distribution was created, but the request could not be updated. Contact an administrator before retrying.',
        );
      }

      return updatedRequest;
    } catch (error) {
      // Restore the pending state only when distribution creation
      // did not succeed. Do not automatically retry after stock is reserved.
      if (!distributionCreated) {
        await this.requestModel
          .updateOne(
            {
              _id: id,
              status: ReliefSupplyRequestStatus.APPROVED,
            },
            {
              $set: {
                status: ReliefSupplyRequestStatus.PENDING,
              },
              $unset: {
                reviewedBy: 1,
                reviewedAt: 1,
              },
            },
          )
          .exec();
      }

      throw error;
    }
  }

  private getOfficerDistricts(
    user: AuthenticatedUser,
  ): string[] {
    const districts = [
      ...(user.assignedDistricts ?? []),
      ...(user.district ? [user.district] : []),
    ];

    const uniqueDistricts = [
      ...new Set(
        districts
          .map((district) => district.trim())
          .filter(Boolean),
      ),
    ];

    if (uniqueDistricts.length === 0) {
      throw new ForbiddenException(
        'No district is assigned to this officer.',
      );
    }

    return uniqueDistricts;
  }

  private ensureRole(
    user: AuthenticatedUser,
    allowedRoles: UserRole[],
  ): void {
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You are not authorized to perform this action.',
      );
    }
  }

  private validateObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB ID.');
    }

    return new Types.ObjectId(id);
  }
}
