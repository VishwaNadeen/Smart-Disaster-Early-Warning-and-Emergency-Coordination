
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

import {
  ReliefSupplyCategory,
  ReliefSupplyUnit,
} from '../schemas/relief-supply.schema';

export class CreateReliefSupplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  supplyCode: string;

  @IsEnum(ReliefSupplyCategory)
  category: ReliefSupplyCategory;

  @IsEnum(ReliefSupplyUnit)
  unit: ReliefSupplyUnit;

  @IsInt()
  @Min(0)
  totalQuantity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumStockLevel?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  storageLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
