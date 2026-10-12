import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RescueTeamStatus,
  RescueTeamType,
} from '../schemas/rescue-team.schema';

export class UpdateRescueTeamDto {
  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  teamName?: string;

  @IsOptional()
  @IsEnum(RescueTeamType)
  teamType?: RescueTeamType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  memberCount?: number;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  baseStation?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEnum(RescueTeamStatus)
  status?: RescueTeamStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialization?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
