
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

import { AlertSeverity } from '../schemas/hazard-alert.schema';
import { NotificationChannel } from '../schemas/notification-delivery.schema';

export class CreateHazardAlertDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  message!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  safetyInstructions!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  hazardType!: string;

  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @Matches(/^[\p{L}\p{M}\p{N} .'-]{2,100}$/u, {
    each: true,
  })
  affectedDistricts!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @Matches(/^[\p{L}\p{M}\p{N} .'-]{2,100}$/u, {
    each: true,
  })
  affectedCities!: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsEnum(NotificationChannel, { each: true })
  notificationChannels?: NotificationChannel[];

  @IsOptional()
  @IsMongoId()
  sourceReportId?: string;
}
