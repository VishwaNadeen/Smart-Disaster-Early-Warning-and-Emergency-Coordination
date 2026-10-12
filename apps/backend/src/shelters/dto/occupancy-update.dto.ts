
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum OccupancyUpdateType {
  ARRIVAL = 'ARRIVAL',
  DEPARTURE = 'DEPARTURE',
  VERIFIED_COUNT = 'VERIFIED_COUNT',
}

export class OccupancyUpdateDto {
  @IsEnum(OccupancyUpdateType)
  type: OccupancyUpdateType;

  @IsInt()
  @Min(0)
  count: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  notes?: string;
}
