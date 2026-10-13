import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import { HydratedDocument, Types } from 'mongoose';

import {
  ReliefSupplyCategory,
  ReliefSupplyUnit,
} from '../../relief-supplies/schemas/relief-supply.schema';

export type ReliefSupplyRequestDocument =
  HydratedDocument<ReliefSupplyRequest>;

export enum ReliefSupplyRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PARTIALLY_ALLOCATED = 'PARTIALLY_ALLOCATED',
  ALLOCATED = 'ALLOCATED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class ReliefSupplyRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'Shelter',
    required: true,
    index: true,
  })
  shelterId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  requestedBy: Types.ObjectId;

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
    trim: true,
    maxlength: 100,
  })
  itemName: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ReliefSupplyUnit),
  })
  unit: ReliefSupplyUnit;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    validate: Number.isInteger,
  })
  requestedQuantity: number;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  })
  reason: string;

  @Prop({
    type: String,
    enum: Object.values(ReliefSupplyRequestStatus),
    default: ReliefSupplyRequestStatus.PENDING,
    index: true,
  })
  status: ReliefSupplyRequestStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  reviewedBy?: Types.ObjectId;

  @Prop({
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  })
  decisionNotes: string;

  @Prop({
    type: Date,
    default: null,
  })
  reviewedAt?: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'ReliefSupplyDistribution',
    default: null,
  })
  distributionId?: Types.ObjectId;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  allocatedQuantity: number;
}

export const ReliefSupplyRequestSchema =
  SchemaFactory.createForClass(ReliefSupplyRequest);

// Helps officers retrieve pending requests efficiently.
ReliefSupplyRequestSchema.index({
  status: 1,
  createdAt: -1,
});

ReliefSupplyRequestSchema.index({
  shelterId: 1,
  createdAt: -1,
});
