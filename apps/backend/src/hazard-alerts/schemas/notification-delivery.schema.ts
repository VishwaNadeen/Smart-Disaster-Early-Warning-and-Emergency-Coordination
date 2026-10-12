
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import { HydratedDocument } from 'mongoose';

export type NotificationDeliveryDocument =
  HydratedDocument<NotificationDelivery>;

export enum NotificationChannel {
  PUSH = 'PUSH',
  WHATSAPP = 'WHATSAPP',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class NotificationDelivery {
  @Prop({ required: true, index: true })
  alertId: string;

  @Prop({ required: true, index: true })
  recipientId: string;

  @Prop({
  type: String,
  required: true,
  enum: Object.values(NotificationChannel),
  })
  channel: NotificationChannel;

@Prop({
  type: String,
  required: true,
  enum: Object.values(DeliveryStatus),
  default: DeliveryStatus.PENDING,
  index: true,
  })
  status: DeliveryStatus;

  @Prop()
  providerMessageId?: string;

  @Prop({ maxlength: 500 })
  failureReason?: string;

  @Prop()
  sentAt?: Date;

  @Prop()
  deliveredAt?: Date;
}

export const NotificationDeliverySchema =
  SchemaFactory.createForClass(NotificationDelivery);

// Prevent duplicate records for the same alert, recipient,
// and channel.
NotificationDeliverySchema.index(
  {
    alertId: 1,
    recipientId: 1,
    channel: 1,
  },
  { unique: true },
);

NotificationDeliverySchema.index({
  alertId: 1,
  status: 1,
});
