
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

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

import {
  User,
  UserRole,
} from '../users/schemas/user.schema';

import { CreateReliefSupplyDistributionDto } from './dto/create-relief-supply-distribution.dto';
import { UpdateReliefSupplyDistributionDto } from './dto/update-relief-supply-distribution.dto';

interface AuthenticatedUser {
  id: string;
  role: UserRole;
  email?: string;
}

@Injectable()
export class ReliefSupplyDistributionsService {
  // REVIEW [DIP]: injects the Shelter and User models of other modules directly instead of depending on SheltersService/UsersService.
  constructor(
    @InjectModel(ReliefSupply.name)
    private readonly supplyModel: Model<ReliefSupply>,

    @InjectModel(ReliefSupplyDistribution.name)
    private readonly distributionModel: Model<ReliefSupplyDistribution>,

    @InjectModel(Shelter.name)
    private readonly shelterModel: Model<Shelter>,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  // REVIEW [DRY]: duplicate of ReliefSuppliesService.getStockStatus.
  private getStockStatus(
    availableQuantity: number,
    minimumStockLevel: number,
  ): ReliefSupplyStatus {
    if (availableQuantity === 0) {
      return ReliefSupplyStatus.OUT_OF_STOCK;
    }

    if (availableQuantity <= minimumStockLevel) {
      return ReliefSupplyStatus.LOW_STOCK;
    }

    return ReliefSupplyStatus.AVAILABLE;
  }

  private ensureManagementRole(user: AuthenticatedUser): void {
    const allowedRoles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.SYSTEM_ADMIN,
      UserRole.DUTY_OFFICER,
      UserRole.DISTRICT_OFFICER,
    ];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You are not authorized to manage supply distributions.',
      );
    }
  }

  private async verifyAllocationPermission(
    user: AuthenticatedUser,
    shelter: Shelter,
  ): Promise<void> {
    const globalRoles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.SYSTEM_ADMIN,
      UserRole.DUTY_OFFICER,
    ];

    if (globalRoles.includes(user.role)) {
      return;
    }

    if (user.role !== UserRole.DISTRICT_OFFICER) {
      throw new ForbiddenException(
        'You are not authorized to allocate relief supplies.',
      );
    }

    if (!Types.ObjectId.isValid(user.id)) {
      throw new ForbiddenException(
        'The authenticated user ID is invalid.',
      );
    }

    // REVIEW [DRY]: officer district lookup is repeated in findAll() below and in 3 other services - extract a shared DistrictAccessPolicy.
    const officer = await this.userModel
      .findById(user.id)
      .select('district assignedDistricts isActive')
      .exec();

    if (!officer || !officer.isActive) {
      throw new ForbiddenException(
        'Your account is not authorized to allocate supplies.',
      );
    }

    const permittedDistricts = [
      ...(officer.district ? [officer.district] : []),
      ...(officer.assignedDistricts ?? []),
    ].map((district) => district.trim().toLowerCase());

    if (
      !permittedDistricts.includes(
        shelter.district.trim().toLowerCase(),
      )
    ) {
      throw new ForbiddenException(
        'You can only manage shelters in your assigned districts.',
      );
    }
  }

  // Allocate stock to a shelter.
  async create(
    dto: CreateReliefSupplyDistributionDto,
    user: AuthenticatedUser,
  ) {
    this.ensureManagementRole(user);

    if (!Types.ObjectId.isValid(user.id)) {
      throw new ForbiddenException(
        'The authenticated user ID is invalid.',
      );
    }

    const supply = await this.supplyModel
      .findById(dto.supplyId)
      .exec();

    if (!supply) {
      throw new NotFoundException(
        'Relief supply item was not found.',
      );
    }

    if (supply.status === ReliefSupplyStatus.INACTIVE) {
      throw new BadRequestException(
        'This supply item is inactive.',
      );
    }

    const shelter = await this.shelterModel
      .findById(dto.shelterId)
      .exec();

    if (!shelter || !shelter.isActive) {
      throw new NotFoundException(
        'An active shelter with this ID was not found.',
      );
    }

    if (
      shelter.operationalStatus !==
      ShelterOperationalStatus.OPEN
    ) {
      throw new BadRequestException(
        'Supplies can only be allocated to open shelters.',
      );
    }

    await this.verifyAllocationPermission(user, shelter);

    // Reserve available stock atomically.
    const updatedSupply = await this.supplyModel
      .findOneAndUpdate(
        {
          _id: supply._id,
          status: { $ne: ReliefSupplyStatus.INACTIVE },
          availableQuantity: {
            $gte: dto.allocatedQuantity,
          },
        },
        {
          $inc: {
            availableQuantity: -dto.allocatedQuantity,
            reservedQuantity: dto.allocatedQuantity,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!updatedSupply) {
      throw new BadRequestException(
        'Insufficient available stock. Check the current inventory quantity.',
      );
    }

    // REVIEW [Concurrency]: quantity update and status update are two separate writes - a parallel allocation can leave status stale.
    updatedSupply.status = this.getStockStatus(
      updatedSupply.availableQuantity,
      updatedSupply.minimumStockLevel,
    );

    await updatedSupply.save();

    try {
      const distribution = await this.distributionModel.create({
        supplyId: updatedSupply._id,
        shelterId: shelter._id,
        shelterName: shelter.name,
        allocatedQuantity: dto.allocatedQuantity,
        dispatchedQuantity: 0,
        deliveredQuantity: 0,
        allocatedBy: new Types.ObjectId(user.id),
        status: ReliefSupplyDistributionStatus.ALLOCATED,
        notes: dto.notes ?? '',
      });

      return {
        message: 'Relief supplies allocated successfully.',
        distribution,
        remainingAvailableQuantity:
          updatedSupply.availableQuantity,
      };
    } catch (error) {
      // Restore stock if distribution creation fails.
      const restoredSupply = await this.supplyModel
        .findByIdAndUpdate(
          updatedSupply._id,
          {
            $inc: {
              availableQuantity: dto.allocatedQuantity,
              reservedQuantity: -dto.allocatedQuantity,
            },
          },
          { new: true },
        )
        .exec();

      if (restoredSupply) {
        restoredSupply.status = this.getStockStatus(
          restoredSupply.availableQuantity,
          restoredSupply.minimumStockLevel,
        );

        await restoredSupply.save();
      }

      throw error;
    }
  }

  // Update dispatch, delivery, or cancellation status.
  // REVIEW [SRP/Long Method]: ~235 lines mixing validation, state machine and stock accounting - split into validateTransition() and applyStockChange().
  async updateStatus(
    id: string,
    dto: UpdateReliefSupplyDistributionDto,
    user: AuthenticatedUser,
  ) {
    this.ensureManagementRole(user);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid distribution ID.',
      );
    }

    const distribution = await this.distributionModel
      .findById(id)
      .exec();

    if (!distribution) {
      throw new NotFoundException(
        'Distribution record was not found.',
      );
    }

    const shelter = await this.shelterModel
      .findById(distribution.shelterId)
      .exec();

    if (!shelter) {
      throw new NotFoundException(
        'The associated shelter was not found.',
      );
    }

    await this.verifyAllocationPermission(user, shelter);

    const previousStatus = distribution.status;
    const previousDispatched = distribution.dispatchedQuantity;
    const previousDelivered = distribution.deliveredQuantity;
    const allocatedQuantity = distribution.allocatedQuantity;

    if (
      previousStatus === ReliefSupplyDistributionStatus.CANCELLED ||
      previousStatus === ReliefSupplyDistributionStatus.DELIVERED
    ) {
      throw new BadRequestException(
        'This distribution is already completed or cancelled.',
      );
    }

    const dispatchedQuantity =
      dto.dispatchedQuantity ?? previousDispatched;

    const deliveredQuantity =
      dto.deliveredQuantity ?? previousDelivered;

    if (
      dispatchedQuantity < previousDispatched ||
      deliveredQuantity < previousDelivered
    ) {
      throw new BadRequestException(
        'Dispatched and delivered quantities cannot be reduced.',
      );
    }

    if (
      dispatchedQuantity > allocatedQuantity ||
      deliveredQuantity > dispatchedQuantity
    ) {
      throw new BadRequestException(
        'Quantities must satisfy: delivered <= dispatched <= allocated.',
      );
    }

    const cancelling =
      dto.status === ReliefSupplyDistributionStatus.CANCELLED;

    if (
      cancelling &&
      (previousDispatched > 0 || previousDelivered > 0)
    ) {
      throw new BadRequestException(
        'A distribution cannot be cancelled after dispatch has started.',
      );
    }

    // REVIEW [OCP - good]: table-driven transitions are easy to extend; move this map to a module-level constant so it is not rebuilt per call.
    const validTransitions: Record<
      ReliefSupplyDistributionStatus,
      ReliefSupplyDistributionStatus[]
    > = {
      [ReliefSupplyDistributionStatus.ALLOCATED]: [
        ReliefSupplyDistributionStatus.ALLOCATED,
        ReliefSupplyDistributionStatus.DISPATCHED,
        ReliefSupplyDistributionStatus.CANCELLED,
      ],
      [ReliefSupplyDistributionStatus.DISPATCHED]: [
        ReliefSupplyDistributionStatus.DISPATCHED,
        ReliefSupplyDistributionStatus.PARTIALLY_DELIVERED,
        ReliefSupplyDistributionStatus.DELIVERED,
      ],
      [ReliefSupplyDistributionStatus.PARTIALLY_DELIVERED]: [
        ReliefSupplyDistributionStatus.PARTIALLY_DELIVERED,
        ReliefSupplyDistributionStatus.DELIVERED,
      ],
      [ReliefSupplyDistributionStatus.DELIVERED]: [],
      [ReliefSupplyDistributionStatus.CANCELLED]: [],
    };

    if (!validTransitions[previousStatus]?.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${previousStatus} to ${dto.status}.`,
      );
    }

    if (
      dto.status === ReliefSupplyDistributionStatus.DISPATCHED &&
      dispatchedQuantity === 0
    ) {
      throw new BadRequestException(
        'Record a positive dispatched quantity before changing the status to DISPATCHED.',
      );
    }

    if (
      dto.status ===
        ReliefSupplyDistributionStatus.PARTIALLY_DELIVERED &&
      (deliveredQuantity <= 0 ||
        deliveredQuantity >= allocatedQuantity)
    ) {
      throw new BadRequestException(
        'Partially delivered quantity must be greater than zero and less than the allocated quantity.',
      );
    }

    if (
      dto.status === ReliefSupplyDistributionStatus.DELIVERED &&
      deliveredQuantity !== allocatedQuantity
    ) {
      throw new BadRequestException(
        'The full allocated quantity must be delivered before completion.',
      );
    }

    const supply = await this.supplyModel
      .findById(distribution.supplyId)
      .exec();

    if (!supply) {
      throw new NotFoundException(
        'The associated supply item was not found.',
      );
    }

    const newlyDispatched =
      dispatchedQuantity - previousDispatched;

    // Dispatch consumes reserved stock. Cancellation releases
    // the complete reservation back into available inventory.
    if (newlyDispatched > 0 || cancelling) {
      const reservationToRelease = cancelling
        ? allocatedQuantity
        : newlyDispatched;

      const stockUpdate = cancelling
        ? {
            $inc: {
              availableQuantity: allocatedQuantity,
              reservedQuantity: -allocatedQuantity,
            },
          }
        : {
            $inc: {
              reservedQuantity: -newlyDispatched,
              totalQuantity: -newlyDispatched,
            },
          };

      const updatedSupply = await this.supplyModel
        .findOneAndUpdate(
          {
            _id: supply._id,
            reservedQuantity: {
              $gte: reservationToRelease,
            },
            ...(cancelling
              ? {}
              : {
                  totalQuantity: {
                    $gte: newlyDispatched,
                  },
                }),
          },
          stockUpdate,
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      if (!updatedSupply) {
        throw new BadRequestException(
          'The inventory reservation could not be updated safely.',
        );
      }

      updatedSupply.status = this.getStockStatus(
        updatedSupply.availableQuantity,
        updatedSupply.minimumStockLevel,
      );

      await updatedSupply.save();
    }

    distribution.dispatchedQuantity = dispatchedQuantity;
    distribution.deliveredQuantity = deliveredQuantity;
    distribution.status = dto.status;

    if (dto.notes !== undefined) {
      distribution.notes = dto.notes;
    }

    if (newlyDispatched > 0 && !distribution.dispatchedAt) {
      distribution.dispatchedAt = new Date();
    }

    if (dto.status === ReliefSupplyDistributionStatus.DELIVERED) {
      distribution.deliveredAt = new Date();
    }

    await distribution.save();

    return {
      message: 'Distribution updated successfully.',
      distribution,
    };
  }

  // List distributions, scoped to a district officer's districts.
  async findAll(user: AuthenticatedUser) {
    this.ensureManagementRole(user);

    const query: Record<string, unknown> = {};

    if (user.role === UserRole.DISTRICT_OFFICER) {
      if (!Types.ObjectId.isValid(user.id)) {
        throw new ForbiddenException(
          'The authenticated user ID is invalid.',
        );
      }

      const officer = await this.userModel
        .findById(user.id)
        .select('district assignedDistricts isActive')
        .exec();

      if (!officer || !officer.isActive) {
        throw new ForbiddenException(
          'Your account is not authorized to view distributions.',
        );
      }

      const districts = [
        ...(officer.district ? [officer.district] : []),
        ...(officer.assignedDistricts ?? []),
      ];

      // REVIEW [Bug]: exact, case-sensitive district match, while verifyAllocationPermission() compares lowercase - an officer can miss distributions if casing differs.
      const shelters = await this.shelterModel
        .find({
          district: {
            $in: districts,
          },
        })
        .select('_id')
        .exec();

      query.shelterId = {
        $in: shelters.map((shelter) => shelter._id),
      };
    }

    return this.distributionModel
      .find(query)
      .populate('supplyId')
      .populate('shelterId')
      .sort({ createdAt: -1 })
      .exec();
  }
}
