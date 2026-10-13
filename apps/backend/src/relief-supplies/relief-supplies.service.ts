
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  ReliefSupply,
  ReliefSupplyStatus,
} from './schemas/relief-supply.schema';

import { CreateReliefSupplyDto } from './dto/create-relief-supply.dto';
import { UpdateReliefSupplyStockDto } from './dto/update-relief-supply-stock.dto';

import { UserRole } from '../users/schemas/user.schema';

// REVIEW [DRY]: AuthenticatedUser is redefined in 5 backend files - move it to one shared auth type.
interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class ReliefSuppliesService {
  constructor(
    @InjectModel(ReliefSupply.name)
    private readonly reliefSupplyModel: Model<ReliefSupply>,
  ) {}

  // Only authorized operational officers and administrators
  // can manage the central relief supply inventory.
  // REVIEW [OCP/Inconsistency]: role list is hard-coded in 5 places; DUTY_OFFICER is global here but district-scoped in SheltersService.
  private canManageSupplies(user: AuthenticatedUser): boolean {
    return [
      UserRole.ADMIN,
      UserRole.SYSTEM_ADMIN,
      UserRole.DUTY_OFFICER,
      UserRole.DISTRICT_OFFICER,
    ].includes(user.role);
  }

  // Determine the current status using available stock.
  // REVIEW [DRY]: identical copy exists in ReliefSupplyDistributionsService - extract to a shared stock-status helper.
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

  // Register a new relief supply item.
  async create(
    dto: CreateReliefSupplyDto,
    user: AuthenticatedUser,
  ) {
    // REVIEW [SRP]: every method repeats this role check - a RolesGuard/@Roles() decorator would move authorization out of business logic.
    if (!this.canManageSupplies(user)) {
      throw new ForbiddenException(
        'You are not authorized to register relief supplies.',
      );
    }

    const supplyCode = dto.supplyCode.trim().toUpperCase();

    const existing = await this.reliefSupplyModel.findOne({
      supplyCode,
    });

    if (existing) {
      throw new ConflictException(
        'A relief supply with this code already exists.',
      );
    }

    const minimumStockLevel = dto.minimumStockLevel ?? 10;

    const status = this.getStockStatus(
      dto.totalQuantity,
      minimumStockLevel,
    );

    return this.reliefSupplyModel.create({
      ...dto,
      supplyCode,
      totalQuantity: dto.totalQuantity,
      availableQuantity: dto.totalQuantity,
      reservedQuantity: 0,
      minimumStockLevel,
      status,
    });
  }

  // Retrieve the inventory with optional search and category filters.
  async findAll(
    user: AuthenticatedUser,
    filters: {
      search?: string;
      category?: string;
      status?: string;
    } = {},
  ) {
    if (!this.canManageSupplies(user)) {
      throw new ForbiddenException(
        'You are not authorized to view the relief supply inventory.',
      );
    }

    const query: Record<string, unknown> = {};

    if (filters.search?.trim()) {
      // REVIEW [DRY]: regex escaping is duplicated in SheltersService and ReliefSupplyRequestsService.
      const escapedSearch = filters.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      query.$or = [
        { name: new RegExp(escapedSearch, 'i') },
        { supplyCode: new RegExp(escapedSearch, 'i') },
      ];
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    return this.reliefSupplyModel
      .find(query)
      .sort({ name: 1 })
      .exec();
  }

  // Retrieve one supply item.
  async findOne(id: string, user: AuthenticatedUser) {
    if (!this.canManageSupplies(user)) {
      throw new ForbiddenException(
        'You are not authorized to view relief supplies.',
      );
    }

    const supply = await this.reliefSupplyModel.findById(id).exec();

    if (!supply) {
      throw new NotFoundException(
        'Relief supply item was not found.',
      );
    }

    return supply;
  }

  // Add newly received stock to the inventory.
  async addStock(
    id: string,
    dto: UpdateReliefSupplyStockDto,
    user: AuthenticatedUser,
  ) {
    if (!this.canManageSupplies(user)) {
      throw new ForbiddenException(
        'You are not authorized to update relief supply stock.',
      );
    }

    // REVIEW [Smell]: the DTO allows 0 (@Min(0)) but this rejects it - change the DTO to @Min(1) so validation lives in one place.
    if (dto.quantity <= 0) {
      throw new BadRequestException(
        'The quantity added must be greater than zero.',
      );
    }

    const supply = await this.reliefSupplyModel.findById(id).exec();

    if (!supply) {
      throw new NotFoundException(
        'Relief supply item was not found.',
      );
    }

    if (supply.status === ReliefSupplyStatus.INACTIVE) {
      throw new BadRequestException(
        'Stock cannot be added to an inactive supply item.',
      );
    }

    const totalQuantity = supply.totalQuantity + dto.quantity;
    const availableQuantity = supply.availableQuantity + dto.quantity;

    supply.totalQuantity = totalQuantity;
    supply.availableQuantity = availableQuantity;

    supply.status = this.getStockStatus(
      availableQuantity,
      supply.minimumStockLevel,
    );

    await supply.save();

    return {
      message: 'Relief supply stock updated successfully.',
      reason: dto.reason,
      supply,
    };
  }
}
