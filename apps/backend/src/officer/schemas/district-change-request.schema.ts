import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DistrictChangeRequestDocument = HydratedDocument<DistrictChangeRequest>;

@Schema({ timestamps: true })
export class DistrictChangeRequest {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  officerId!: Types.ObjectId;

  @Prop({ required: true, enum: ['ADD', 'REMOVE'] })
  action!: 'ADD' | 'REMOVE';

  @Prop({ type: [String], required: true })
  districts!: string[];

  @Prop({ required: true, trim: true })
  reason!: string;

  @Prop({ required: true, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true })
  status!: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Prop({ type: Types.ObjectId })
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewedAt?: Date;

  @Prop({ trim: true })
  reviewMessage?: string;
}
export const DistrictChangeRequestSchema = SchemaFactory.createForClass(DistrictChangeRequest);
DistrictChangeRequestSchema.index({ officerId: 1, status: 1, createdAt: -1 });
