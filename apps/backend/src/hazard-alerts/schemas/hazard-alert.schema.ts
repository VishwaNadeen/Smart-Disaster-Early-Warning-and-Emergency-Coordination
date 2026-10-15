
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import { HydratedDocument } from 'mongoose';
import { NotificationChannel } from './notification-delivery.schema';

export type HazardAlertDocument =
  HydratedDocument<HazardAlert>;

export enum AlertSeverity {
  INFORMATION = 'INFORMATION',
  WATCH = 'WATCH',
  WARNING = 'WARNING',
  EMERGENCY = 'EMERGENCY',
}

export enum HazardAlertStatus {
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class HazardAlert {
  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  message: string;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  safetyInstructions: string;

  @Prop({ required: true, trim: true, maxlength: 60 })
  hazardType: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AlertSeverity),
    index: true,
  })
  severity: AlertSeverity;

  @Prop({
    required: true,
    type: [String],
    index: true,
  })
  affectedDistricts: string[];

  @Prop({
    required: true,
    type: [String],
    index: true,
  })
  affectedCities: string[];

  @Prop({
    type: [String],
    enum: Object.values(NotificationChannel),
    default: [
      NotificationChannel.SMS,
      NotificationChannel.PUSH,
      NotificationChannel.WHATSAPP,
    ],
  })
  notificationChannels: NotificationChannel[];

  @Prop({ index: true })
  sourceReportId?: string;

  @Prop({ trim: true, index: true })
  sourceReportNumber?: string;

  @Prop({
    required: true,
    index: true,
  })
  publishedBy: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(HazardAlertStatus),
    default: HazardAlertStatus.PUBLISHED,
    index: true,
  })
  status: HazardAlertStatus;

  @Prop({ default: Date.now, index: true })
  publishedAt: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop({ trim: true, maxlength: 500 })
  cancellationReason?: string;
}

export const HazardAlertSchema =
  SchemaFactory.createForClass(HazardAlert);

HazardAlertSchema.index({
  status: 1,
  publishedAt: -1,
});
