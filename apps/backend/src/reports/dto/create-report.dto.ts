import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { HazardType } from '../schemas/report.schema';

export class CreateReportDto {
  @IsEnum(HazardType)
  hazardType: HazardType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customHazardType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: string;

  @IsOptional()
  @IsLongitude()
  longitude?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  manualLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  district?: string;          // ← added

  @IsOptional()
  @IsString()
  @MaxLength(150)
  city?: string;
}