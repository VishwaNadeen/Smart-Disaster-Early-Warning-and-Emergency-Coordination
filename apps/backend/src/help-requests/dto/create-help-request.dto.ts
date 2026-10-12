import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { HelpRequestUrgency } from '../schemas/help-request.schema';

export class CreateHelpRequestDto {
  @IsString() @MaxLength(3000) description: string;
  @IsOptional() @IsEnum(HelpRequestUrgency) urgency?: HelpRequestUrgency;
  @ValidateIf((o) => o.latitude !== undefined) @IsLatitude() latitude?: string;
  @ValidateIf((o) => o.longitude !== undefined) @IsLongitude() longitude?: string;
  @IsOptional() @IsString() @MaxLength(500) locationDescription?: string;
  @IsOptional() @IsString() @MaxLength(150) district?: string;
  @IsOptional() @IsString() @MaxLength(150) city?: string;
}
