
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
} from 'mongoose';

export type ShelterDocument =
  HydratedDocument<Shelter>;

export enum ShelterOperationalStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  MAINTENANCE = 'MAINTENANCE',
}

@Schema({
  timestamps: true,
})
export class Shelter {
  @Prop({
    required: true,
    trim: true,
  })
  name: string;

  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  })
  shelterCode: string;

  @Prop({
    required: true,
    trim: true,
  })
  address: string;

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  city: string;

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  district: string;

  @Prop({
    required: true,
    trim: true,
  })
  province: string;

  @Prop({
    min: 0,
    default: 0,
  })
  latitude: number;

  @Prop({
    min: 0,
    default: 0,
  })
  longitude: number;

  @Prop({
    required: true,
    min: 1,
  })
  maximumCapacity: number;

  // Current verified number of people inside the shelter.
  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  currentOccupancy: number;

  @Prop({
    enum: ShelterOperationalStatus,
    default: ShelterOperationalStatus.OPEN,
    index: true,
  })
  operationalStatus: ShelterOperationalStatus;

  @Prop({
    default: true,
    index: true,
  })
  isActive: boolean;

  @Prop({
    type: [String],
    default: [],
  })
  facilities: string[];

  @Prop({
    trim: true,
  })
  notes?: string;

  @Prop()
  lastOccupancyVerifiedAt?: Date;
}

export const ShelterSchema =
  SchemaFactory.createForClass(Shelter);
