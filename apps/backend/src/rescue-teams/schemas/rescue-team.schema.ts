import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';
import {
  HydratedDocument,
  Types,
} from 'mongoose';

export type RescueTeamDocument = HydratedDocument<RescueTeam>;

export enum RescueTeamType {
  ARMY = 'ARMY',
  NAVY = 'NAVY',
  AIR_FORCE = 'AIR_FORCE',
  POLICE = 'POLICE',
  FIRE_RESCUE = 'FIRE_RESCUE',
  COAST_GUARD = 'COAST_GUARD',
  MEDICAL_EMT = 'MEDICAL_EMT',
  DISASTER_RELIEF = 'DISASTER_RELIEF',
  OTHER = 'OTHER',
}

export enum RescueTeamStatus {
  AVAILABLE = 'AVAILABLE',
  DEPLOYED = 'DEPLOYED',
  STANDBY = 'STANDBY',
  OFF_DUTY = 'OFF_DUTY',
}

@Schema({
  timestamps: true,
})
export class RescueTeam {
  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  teamId: string;

  @Prop({
    required: true,
    trim: true,
  })
  teamName: string;

  @Prop({
    required: true,
    type: String,
    enum: RescueTeamType,
    default: RescueTeamType.ARMY,
    index: true,
  })
  teamType: RescueTeamType;

  @Prop({
    required: true,
    min: 1,
    default: 1,
  })
  memberCount: number;

  @Prop({
    trim: true,
    index: true,
  })
  district?: string;

  @Prop({
    trim: true,
  })
  baseStation?: string;

  @Prop({
    trim: true,
  })
  contactPerson?: string;

  @Prop({
    trim: true,
  })
  contactPhone?: string;

  @Prop({
    type: String,
    enum: RescueTeamStatus,
    default: RescueTeamStatus.AVAILABLE,
    index: true,
  })
  status: RescueTeamStatus;

  @Prop({
    type: [String],
    default: [],
  })
  specialization: string[];

  @Prop({
    trim: true,
  })
  notes?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: Types.ObjectId;

  @Prop({
    trim: true,
  })
  createdByName?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  updatedBy?: Types.ObjectId;

  @Prop()
  deletedAt?: Date;
}

export const RescueTeamSchema = SchemaFactory.createForClass(RescueTeam);

RescueTeamSchema.index({ district: 1, status: 1 });
RescueTeamSchema.index({ teamType: 1, status: 1 });
RescueTeamSchema.index({ deletedAt: 1 });
