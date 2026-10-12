
import { IsInt, IsNotEmpty, IsString, Min, MaxLength } from 'class-validator';

export class UpdateReliefSupplyStockDto {
  @IsInt()
  @Min(0)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reason: string;
}
