
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
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
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({
    enum: UserRole,
    default: UserRole.CITIZEN,
    index: true,
  })
  role: UserRole;

  // Citizen's living district.
  // Kept separate from an officer's assignedDistricts.
  @Prop({ trim: true, index: true })
  district?: string;

  // Citizen's living city/town.
  @Prop({ trim: true, index: true })
  livingCity?: string;

  @Prop({ trim: true })
  address?: string;

  // Firebase Cloud Messaging tokens for Flutter devices.
  @Prop({
    type: [String],
    default: [],
  })
  fcmTokens: string[];

  // WhatsApp messages are only sent with recorded consent.
  @Prop({
    type: Boolean,
    default: false,
  })
  whatsappOptIn: boolean;

  @Prop()
  whatsappOptInAt?: Date;

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

  @Prop({ trim: true })
  officerIdNumber?: string;

  @Prop({ trim: true })
  dmcNumber?: string;

  @Prop({ trim: true })
  workingLocation?: string;

  @Prop({ trim: true })
  officePhoneNumber?: string;

  @Prop({ trim: true })
  residentialAddress?: string;

  @Prop({ trim: true })
  officeAddress?: string;

  // Admin-controlled officer working-district assignments.
  @Prop({
    type: [String],
    default: [],
  })
  assignedDistricts: string[];

  @Prop()
  emailVerificationTokenHash?: string;

  @Prop()
  emailVerificationExpiresAt?: Date;

  @Prop()
  deletedAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema =
  SchemaFactory.createForClass(User);
