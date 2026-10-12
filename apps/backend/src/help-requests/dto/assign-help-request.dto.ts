import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
export class AssignHelpRequestDto {
  @IsMongoId() teamId: string;
  @IsOptional() @IsString() @MaxLength(1000) officerNotes?: string;
}
