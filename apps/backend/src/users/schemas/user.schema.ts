
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
    required: true,
    trim: true,
  })
  fullName: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({
    required: true,
  })
  passwordHash: string;

  @Prop()
  phone?: string;

  @Prop({
    enum: UserRole,
    default: UserRole.CITIZEN,
  })
  role: UserRole;

  @Prop()
  district?: string;

  @Prop()
  address?: string;

  @Prop({
    default: true,
  })
  isActive: boolean;

  @Prop({
    default: false,
    index: true,
  })
  emailVerified: boolean;

  @Prop({
    default: true,
  })
  mustCompleteProfile: boolean;

  @Prop({
    trim: true,
  })
  officerIdNumber?: string;

  @Prop({
    trim: true,
  })
  dmcNumber?: string;

  @Prop({
    trim: true,
  })
  workingLocation?: string;

  @Prop({
    trim: true,
  })
  officePhoneNumber?: string;

  @Prop({
    trim: true,
  })
  residentialAddress?: string;

  @Prop({
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
  @Prop()
  emailVerificationTokenHash?: string;

  @Prop()
  emailVerificationExpiresAt?: Date;

  @Prop()
  deletedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSchema =
  SchemaFactory.createForClass(User);
