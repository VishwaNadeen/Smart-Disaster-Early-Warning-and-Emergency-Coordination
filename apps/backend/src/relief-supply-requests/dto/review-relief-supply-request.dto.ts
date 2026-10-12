
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ReliefSupplyRequestDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewReliefSupplyRequestDto {
  @IsEnum(ReliefSupplyRequestDecision)
  decision: ReliefSupplyRequestDecision;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  decisionNotes?: string;
}
