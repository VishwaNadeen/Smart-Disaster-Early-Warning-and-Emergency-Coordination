import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  HazardType,
} from '../schemas/report.schema';

export class CreateReportDto {
  @IsEnum(HazardType)
  hazardType: HazardType;

  @IsOptional()
  @IsString()
  customHazardType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: string;

  @IsOptional()
  @IsLongitude()
  longitude?: string;

  @IsOptional()
  @IsString()
  manualLocation?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;
}