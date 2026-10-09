import { ArrayMinSize, IsArray, IsIn, IsString, MinLength } from 'class-validator';

export class CreateDistrictRequestDto {
  @IsIn(['ADD', 'REMOVE']) action!: 'ADD' | 'REMOVE';
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) districts!: string[];
  @IsString() @MinLength(5) reason!: string;
}
