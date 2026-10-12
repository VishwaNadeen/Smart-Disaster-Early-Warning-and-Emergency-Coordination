
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import { HydratedDocument } from 'mongoose';

export type ReliefSupplyDocument =
  HydratedDocument<ReliefSupply>;

export enum ReliefSupplyCategory {
  FOOD = 'FOOD',
  WATER = 'WATER',
  MEDICAL = 'MEDICAL',
  CLOTHING = 'CLOTHING',
  HYGIENE = 'HYGIENE',
  SHELTER_EQUIPMENT = 'SHELTER_EQUIPMENT',
  OTHER = 'OTHER',
}

export enum ReliefSupplyUnit {
  PIECES = 'PIECES',
  PACKETS = 'PACKETS',
  BOXES = 'BOXES',
  KILOGRAMS = 'KILOGRAMS',
  LITRES = 'LITRES',
  BOTTLES = 'BOTTLES',
  SETS = 'SETS',
}

export enum ReliefSupplyStatus {
  AVAILABLE = 'AVAILABLE',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  INACTIVE = 'INACTIVE',
}

@Schema({
  timestamps: true,
})
export class ReliefSupply {
  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  name: string;

  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  })
  supplyCode: string;

  @Prop({
    required: true,
    enum: ReliefSupplyCategory,
    index: true,
  })
  category: ReliefSupplyCategory;

  @Prop({
    required: true,
    enum: ReliefSupplyUnit,
  })
  unit: ReliefSupplyUnit;

  // Total physical stock recorded in inventory.
  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  totalQuantity: number;

  // Stock currently available for new allocations.
  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  availableQuantity: number;

  // Stock reserved for allocations but not yet dispatched.
  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  reservedQuantity: number;

  // Used to identify supplies that need replenishment.
  @Prop({
    required: true,
    min: 0,
    default: 10,
  })
  minimumStockLevel: number;

  @Prop({
    trim: true,
    default: '',
  })
  storageLocation: string;

  @Prop({
    trim: true,
    default: '',
  })
  description: string;

  @Prop({
    enum: ReliefSupplyStatus,
    default: ReliefSupplyStatus.AVAILABLE,
    index: true,
  })
  status: ReliefSupplyStatus;
}

export const ReliefSupplySchema =
  SchemaFactory.createForClass(ReliefSupply);
