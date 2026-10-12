
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { OccupancyUpdateType } from '../dto/occupancy-update.dto';

// Represents one recorded shelter occupancy change.
export type OccupancyHistoryDocument =
  HydratedDocument<OccupancyHistory>;

@Schema({ timestamps: true })
export class OccupancyHistory {
  // Reference to the shelter whose occupancy changed.
  @Prop({
    type: Types.ObjectId,
    ref: 'Shelter',
    required: true,
    index: true,
  })
  shelterId: Types.ObjectId;

  // Reference to the authenticated user who made the change.
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  changedBy: Types.ObjectId;

  // Whether people arrived, departed, or a verified count was recorded.
  @Prop({
    type: String,
    enum: OccupancyUpdateType,
    required: true,
  })
  changeType: OccupancyUpdateType;

  // Occupancy before the update.
  @Prop({
    required: true,
    min: 0,
  })
  previousOccupancy: number;

  // Occupancy after the update.
  @Prop({
    required: true,
    min: 0,
  })
  newOccupancy: number;

  // Optional explanation provided by the staff member.
  @Prop({
    trim: true,
    maxlength: 500,
  })
  notes?: string;
}

// Create the Mongoose schema.
export const OccupancyHistorySchema =
  SchemaFactory.createForClass(OccupancyHistory);

// Index records by shelter and most recent creation time.
OccupancyHistorySchema.index({
  shelterId: 1,
  createdAt: -1,
});
