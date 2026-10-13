
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
    type: String,
    required: true,
    trim: true,
  })
  name: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  })
  shelterCode: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  address: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    index: true,
  })
  city: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    index: true,
  })
  district: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  province: string;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  latitude: number;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  longitude: number;

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  maximumCapacity: number;

  @Prop({
    type: String,
    enum: Object.values(ShelterOperationalStatus),
    default: ShelterOperationalStatus.OPEN,
    index: true,
  })
  operationalStatus: ShelterOperationalStatus;

  @Prop({
    type: Boolean,
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
    type: String,
    trim: true,
  })
  notes?: string;
}

export const ShelterSchema =
  SchemaFactory.createForClass(Shelter);
