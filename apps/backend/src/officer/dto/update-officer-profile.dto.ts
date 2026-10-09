import { IsString, MinLength } from 'class-validator';

export class UpdateOfficerProfileDto {
  @IsString() @MinLength(2) fullName!: string;
  @IsString() @MinLength(3) officerIdNumber!: string;
  @IsString() @MinLength(3) dmcNumber!: string;
  @IsString() @MinLength(2) workingLocation!: string;
  @IsString() @MinLength(5) officePhoneNumber!: string;
  @IsString() @MinLength(5) residentialAddress!: string;
  @IsString() @MinLength(5) officeAddress!: string;
}
