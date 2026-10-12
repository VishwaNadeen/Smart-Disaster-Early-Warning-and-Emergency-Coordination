
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import {
  ReliefSupplyCategory,
  ReliefSupplyUnit,
} from '../../relief-supplies/schemas/relief-supply.schema';

export class CreateReliefSupplyRequestDto {
  @IsMongoId()
  shelterId: string;

  @IsEnum(ReliefSupplyCategory)
  category: ReliefSupplyCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  itemName: string;

  @IsEnum(ReliefSupplyUnit)
  unit: ReliefSupplyUnit;

  @IsInt()
  @Min(1)
  requestedQuantity: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
