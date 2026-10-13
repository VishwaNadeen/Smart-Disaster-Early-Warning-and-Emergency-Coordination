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
    type: String,
    required: true,
    trim: true,
    index: true,
  })
  name: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  })
  supplyCode: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ReliefSupplyCategory),
    index: true,
  })
  category: ReliefSupplyCategory;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ReliefSupplyUnit),
  })
  unit: ReliefSupplyUnit;

  // Total physical stock recorded in inventory.
  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 0,
  })
  totalQuantity: number;

  // Stock currently available for new allocations.
  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 0,
  })
  availableQuantity: number;

  // Stock reserved for allocations but not yet dispatched.
  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 0,
  })
  reservedQuantity: number;

  // Used to identify supplies that need replenishment.
  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 10,
  })
  minimumStockLevel: number;

  @Prop({
    type: String,
    trim: true,
    default: '',
  })
  storageLocation: string;

  @Prop({
    type: String,
    trim: true,
    default: '',
  })
  description: string;

  @Prop({
    type: String,
    enum: Object.values(ReliefSupplyStatus),
    default: ReliefSupplyStatus.AVAILABLE,
    index: true,
  })
  status: ReliefSupplyStatus;
}

export const ReliefSupplySchema =
  SchemaFactory.createForClass(ReliefSupply);
