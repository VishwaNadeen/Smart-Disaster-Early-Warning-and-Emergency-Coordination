
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  livingCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;
}
