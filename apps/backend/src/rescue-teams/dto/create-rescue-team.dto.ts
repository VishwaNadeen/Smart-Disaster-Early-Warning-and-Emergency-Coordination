import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RescueTeamStatus,
  RescueTeamType,
} from '../schemas/rescue-team.schema';

export class CreateRescueTeamDto {
 
  // Optional team ID; allow letters, numbers and hyphens.
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'Team ID can contain only letters, numbers and hyphens',
  })
  @MaxLength(30)
  teamId?: string;

  // Team name is required.
  @IsString()
  @IsNotEmpty({ message: 'Team name is required' })
  @MinLength(3, {
    message: 'Team name must contain at least 3 characters',
  })
  @MaxLength(100)
  teamName: string;

  // Must be a valid rescue team type.
  @IsNotEmpty({ message: 'Team type is required' })
  @IsEnum(RescueTeamType, {
    message: 'Please select a valid rescue team type',
  })
  teamType: RescueTeamType;

  // Member count must be a whole number between 1 and 1000.
  @Type(() => Number)
  @IsInt({ message: 'Member count must be a whole number' })
  @Min(1, {
    message: 'Member count must be at least 1',
  })
  @Max(1000, {
    message: 'Member count cannot exceed 1000',
  })
  memberCount: number;

  // Optional district.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  district?: string;

  // Optional base station.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  baseStation?: string;

  // Optional contact person.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactPerson?: string;

  // Sri Lankan phone number validation.
// Validate Sri Lankan contact phone number
@IsOptional()
@IsString()
@Matches(/^(?:0[0-9]{9}|\+94[0-9]{9})$/, {
  message:
    'Invalid phone number.',
})
contactPhone?: string;

  // Only valid rescue team statuses are accepted.
  @IsOptional()
  @IsEnum(RescueTeamStatus, {
    message: 'Please select a valid rescue team status',
  })
  status?: RescueTeamStatus;

  // Specializations must be an array of strings.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, {
    each: true,
    message: 'Each specialization must be 100 characters or fewer',
  })
  specialization?: string[];

  // Optional notes with a maximum length.
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Notes cannot exceed 500 characters',
  })
  notes?: string;
}
