import { IsIn, IsString, MinLength } from 'class-validator';

export class ReviewDistrictRequestDto {
  @IsIn(['APPROVE', 'REJECT']) decision!: 'APPROVE' | 'REJECT';
  @IsString() @MinLength(5) message!: string;
}
