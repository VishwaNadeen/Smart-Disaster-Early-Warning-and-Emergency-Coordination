import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { HazardType } from '../schemas/report.schema'; // adjust path if needed

export class UpdateReportDto {
  @IsOptional()
  @IsEnum(HazardType)
  hazardType?: HazardType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customHazardType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  manualLocation?: string;

  // ========== ADD THESE TWO ==========
  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;
}