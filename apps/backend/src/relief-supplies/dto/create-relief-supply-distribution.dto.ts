
import {
  IsMongoId,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReliefSupplyDistributionDto {
  @IsMongoId()
  supplyId: string;

  @IsMongoId()
  shelterId: string;

  @IsInt()
  @Min(1)
  allocatedQuantity: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  notes?: string;
}
