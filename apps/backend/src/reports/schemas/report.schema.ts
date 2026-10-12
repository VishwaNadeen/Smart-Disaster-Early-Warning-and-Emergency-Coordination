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

// ==================================================
// HAZARD TYPES
// ==================================================

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

// ==================================================
// REPORT STATUSES
// ==================================================

export enum ReportStatus {
  DRAFT = 'DRAFT',
  PENDING_SYNC = 'PENDING_SYNC',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  NEEDS_MORE_INFO = 'NEEDS_MORE_INFO',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
}

// ==================================================
// DISASTER REPORT SCHEMA
// ==================================================

@Schema({
  timestamps: true,
})
export class DisasterReport {
  // Unique report reference.
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  reportNumber: string;

  // ID of the citizen who submitted the report.
  @Prop({
    required: true,
    index: true,
  })
  citizenId: string;

  // Hazard category.
  @Prop({
    required: true,
    enum: HazardType,
  })
  hazardType: HazardType;

  // Required when hazardType is OTHER.
  @Prop({
    type: String,
    trim: true,
  })
  customHazardType?: string;

  // Citizen's description of the incident.
  @Prop({
    type: String,
    trim: true,
  })
  description?: string;

  // Preserved for compatibility with the existing frontend.
  @Prop({
    type: String,
  })
  photoUrl?: string;

  // Paths for all uploaded attachments.
  @Prop({
    type: [String],
    default: [],
  })
  attachments: string[];

  // GPS coordinates.
  @Prop({
    type: Number,
    min: -90,
    max: 90,
  })
  latitude?: number;

  @Prop({
    type: Number,
    min: -180,
    max: 180,
  })
  longitude?: number;

  // Manually entered location.
  @Prop({
    type: String,
    trim: true,
  })
  manualLocation?: string;

  // District used for officer assignment and filtering.
  @Prop({
    type: String,
    trim: true,
    index: true,
  })
  district?: string;

  // City or local area.
  @Prop({
    type: String,
    trim: true,
  })
  city?: string;

  // Verification workflow status.
  @Prop({
    type: String,
    enum: ReportStatus,
    default: ReportStatus.PENDING_VERIFICATION,
    index: true,
  })
  status: ReportStatus;

  // Indicates a possible duplicate, not a confirmed duplicate.
  @Prop({
    type: Boolean,
    default: false,
  })
  possibleDuplicate: boolean;

  // Explanation when an officer rejects a report.
  @Prop({
    type: String,
    trim: true,
  })
  rejectionReason?: string;

  // Officer feedback or request for more information.
  @Prop({
    type: String,
    trim: true,
  })
  officerNotes?: string;

  // Soft deletion; the document remains in the database.
  @Prop({
    type: Date,
  })
  deletedAt?: Date;

  // Report submission time.
  @Prop({
    type: Date,
    default: Date.now,
    index: true,
  })
  submittedAt?: Date;
}

// ==================================================
// MONGOOSE SCHEMA
// ==================================================

export const ReportSchema =
  SchemaFactory.createForClass(DisasterReport);

// Geographic lookup index.
ReportSchema.index({
  latitude: 1,
  longitude: 1,
});

// Filter reports by hazard and verification status.
ReportSchema.index({
  hazardType: 1,
  status: 1,
});

// Efficiently retrieve a citizen's reports.
ReportSchema.index({
  citizenId: 1,
  submittedAt: -1,
});

// Efficient district-based officer queue.
ReportSchema.index({
  district: 1,
  status: 1,
});