
import {
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  token!: string;
}
