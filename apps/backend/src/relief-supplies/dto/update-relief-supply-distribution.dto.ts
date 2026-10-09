
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  ReliefSupplyDistributionStatus,
} from '../schemas/relief-supply-distribution.schema';

export class UpdateReliefSupplyDistributionDto {
  @IsEnum(ReliefSupplyDistributionStatus)
  status: ReliefSupplyDistributionStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  dispatchedQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  deliveredQuantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
