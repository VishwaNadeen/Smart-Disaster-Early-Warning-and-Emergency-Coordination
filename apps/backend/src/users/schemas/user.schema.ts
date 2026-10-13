
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  CITIZEN = 'CITIZEN',
  VOLUNTEER = 'VOLUNTEER',
  DUTY_OFFICER = 'DUTY_OFFICER',
  DISTRICT_OFFICER = 'DISTRICT_OFFICER',
  ANALYST = 'ANALYST',
  ADMIN = 'ADMIN',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  SHELTER_STAFF = 'SHELTER_STAFF',
}

@Schema({
  timestamps: true,
})
export class User {
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  fullName: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({
    type: String,
    required: true,
  })
  passwordHash: string;

  @Prop({
    type: String,
  })
  phone?: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.CITIZEN,
  })
  role: UserRole;

  @Prop({
    type: String,
  })
  district?: string;

  @Prop({
    type: String,
  })
  address?: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  emailVerified: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  mustCompleteProfile: boolean;

  @Prop({
    type: String,
    trim: true,
  })
  officerIdNumber?: string;

  @Prop({
    type: String,
    trim: true,
  })
  dmcNumber?: string;

  @Prop({
    type: String,
    trim: true,
  })
  workingLocation?: string;

  @Prop({
    type: String,
    trim: true,
  })
  officePhoneNumber?: string;

  @Prop({
    type: String,
    trim: true,
  })
  residentialAddress?: string;

  @Prop({
    type: String,
    trim: true,
  })
  officeAddress?: string;

  // Admin-controlled district assignments.
  @Prop({
    type: [String],
    default: [],
  })
  assignedDistricts: string[];

  // Admin-controlled shelter assignments for shelter staff.
  @Prop({
    type: [Types.ObjectId],
    ref: 'Shelter',
    default: [],
  })
  assignedShelterIds: Types.ObjectId[];

  // Store only the SHA-256 token hash.
  @Prop({
    type: String,
  })
  emailVerificationTokenHash?: string;

  @Prop({
    type: Date,
  })
  emailVerificationExpiresAt?: Date;

  @Prop({
    type: Date,
  })
  deletedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSchema =
  SchemaFactory.createForClass(User);
