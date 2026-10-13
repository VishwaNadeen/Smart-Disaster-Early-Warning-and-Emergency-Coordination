
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import { HydratedDocument, Types } from 'mongoose';

export type ReliefSupplyDistributionDocument =
  HydratedDocument<ReliefSupplyDistribution>;

export enum ReliefSupplyDistributionStatus {
  ALLOCATED = 'ALLOCATED',
  DISPATCHED = 'DISPATCHED',
  PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class ReliefSupplyDistribution {
  @Prop({
    type: Types.ObjectId,
    ref: 'ReliefSupply',
    required: true,
    index: true,
  })
  supplyId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Shelter',
    required: true,
    index: true,
  })
  shelterId: Types.ObjectId;

  // Snapshot for historical records and reporting.
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  shelterName: string;

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  allocatedQuantity: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 0,
  })
  dispatchedQuantity: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    default: 0,
  })
  deliveredQuantity: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  allocatedBy: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ReliefSupplyDistributionStatus),
    default: ReliefSupplyDistributionStatus.ALLOCATED,
    index: true,
  })
  status: ReliefSupplyDistributionStatus;

  @Prop({
    type: String,
    trim: true,
    default: '',
  })
  notes: string;

  @Prop({
    type: Date,
  })
  dispatchedAt?: Date;

  @Prop({
    type: Date,
  })
  deliveredAt?: Date;
}

export const ReliefSupplyDistributionSchema =
  SchemaFactory.createForClass(ReliefSupplyDistribution);
