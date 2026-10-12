import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type HelpRequestDocument = HydratedDocument<HelpRequest>;
export enum HelpRequestStatus { PENDING = 'PENDING', ASSIGNED = 'ASSIGNED', IN_PROGRESS = 'IN_PROGRESS', RESOLVED = 'RESOLVED', CANCELLED = 'CANCELLED' }
export enum HelpRequestUrgency { LOW = 'LOW', MEDIUM = 'MEDIUM', HIGH = 'HIGH', CRITICAL = 'CRITICAL' }

@Schema({ timestamps: true })
export class HelpRequest {
  @Prop({ required: true, unique: true, index: true }) requestNumber: string;
  @Prop({ required: true, index: true, type: Types.ObjectId, ref: 'User' }) citizenId: Types.ObjectId;
  @Prop({ required: true, trim: true }) citizenName: string;
  @Prop({ required: true, trim: true, lowercase: true }) citizenEmail: string;
  @Prop({ required: true, trim: true }) citizenPhone: string;
  @Prop({ required: true, trim: true, maxlength: 3000 }) description: string;
  @Prop({
  type: String,
  enum: Object.values(HelpRequestUrgency),
  default: HelpRequestUrgency.HIGH,
  })
  urgency: HelpRequestUrgency;
  @Prop({ type: Number, min: -90, max: 90 }) latitude?: number;
  @Prop({ type: Number, min: -180, max: 180 }) longitude?: number;
  @Prop({ trim: true }) locationDescription?: string;
  @Prop({ trim: true, index: true }) district?: string;
  @Prop({ trim: true }) city?: string;
  @Prop({
  type: String,
  enum: Object.values(HelpRequestStatus),
  default: HelpRequestStatus.PENDING,
  })
  status: HelpRequestStatus;
  @Prop({ type: Types.ObjectId, ref: 'RescueTeam' }) assignedTeamId?: Types.ObjectId;
  @Prop({ trim: true }) assignedTeamName?: string;
  @Prop({ type: Types.ObjectId, ref: 'User' }) assignedBy?: Types.ObjectId;
  @Prop() assignedAt?: Date;
  @Prop({ trim: true, maxlength: 1000 }) officerNotes?: string;
  @Prop({ type: Date, default: Date.now, index: true }) submittedAt: Date;
}
export const HelpRequestSchema = SchemaFactory.createForClass(HelpRequest);
HelpRequestSchema.index({ district: 1, status: 1, submittedAt: -1 });
HelpRequestSchema.index({ citizenId: 1, submittedAt: -1 });
