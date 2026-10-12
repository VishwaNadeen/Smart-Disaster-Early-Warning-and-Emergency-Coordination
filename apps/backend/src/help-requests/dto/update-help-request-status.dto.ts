import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { HelpRequestStatus } from '../schemas/help-request.schema';
export class UpdateHelpRequestStatusDto {
  @IsEnum(HelpRequestStatus) status: HelpRequestStatus;
  @IsOptional() @IsString() @MaxLength(1000) officerNotes?: string;
}
