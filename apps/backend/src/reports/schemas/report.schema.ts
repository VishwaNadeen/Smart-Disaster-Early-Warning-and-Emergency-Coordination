
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
} from 'mongoose';

export type ReportDocument =
  HydratedDocument<DisasterReport>;

export enum HazardType {
  RISING_WATER = 'RISING_WATER',
  FLOOD = 'FLOOD',
  BLOCKED_ROAD = 'BLOCKED_ROAD',
  LANDSLIDE = 'LANDSLIDE',
  LANDSLIDE_CRACK = 'LANDSLIDE_CRACK',
  STRONG_WIND = 'STRONG_WIND',
  FIRE = 'FIRE',
  EARTHQUAKE = 'EARTHQUAKE',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  PENDING_SYNC = 'PENDING_SYNC',
  PENDING_VERIFICATION =
    'PENDING_VERIFICATION',
  NEEDS_MORE_INFO =
    'NEEDS_MORE_INFO',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
}

@Schema({
  timestamps: true,
})
export class DisasterReport {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  reportNumber: string;

  @Prop({
    required: true,
    index: true,
  })
  citizenId: string;

  @Prop({
    required: true,
    enum: HazardType,
  })
  hazardType: HazardType;

  @Prop()
  customHazardType?: string;

  @Prop()
  description?: string;

  // Preserved for compatibility with existing reports.
  @Prop()
  photoUrl?: string;

  // Paths for all uploaded attachments.
  @Prop({
    type: [String],
    default: [],
  })
  attachments: string[];

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;

  @Prop()
  manualLocation?: string;

  @Prop({
    enum: ReportStatus,
    default:
      ReportStatus.PENDING_VERIFICATION,
    index: true,
  })
  status: ReportStatus;

  @Prop({
    default: false,
  })
  possibleDuplicate: boolean;

  @Prop()
  rejectionReason?: string;

  @Prop()
  officerNotes?: string;

  @Prop()
  deletedAt?: Date;

  @Prop()
  submittedAt?: Date;
}

export const ReportSchema =
  SchemaFactory.createForClass(
    DisasterReport,
  );

ReportSchema.index({
  latitude: 1,
  longitude: 1,
});

ReportSchema.index({
  hazardType: 1,
  status: 1,
});
