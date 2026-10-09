
import {
  IsArray,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  ShelterOperationalStatus,
} from '../schemas/shelter.schema';

export class CreateShelterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  shelterCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  address: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsInt()
  @Min(1)
  maximumCapacity: number;

  @IsOptional()
  @IsEnum(ShelterOperationalStatus)
  operationalStatus?: ShelterOperationalStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
