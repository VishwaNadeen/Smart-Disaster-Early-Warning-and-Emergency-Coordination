import { ArrayMinSize, IsArray, IsEmail, IsString, MinLength } from 'class-validator';

export class CreateOfficerDto {
  @IsString() @MinLength(2) fullName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(12) initialPassword!: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) assignedDistricts!: string[];
}
