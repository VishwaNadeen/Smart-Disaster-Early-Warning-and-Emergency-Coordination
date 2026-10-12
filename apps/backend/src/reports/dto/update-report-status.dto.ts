import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ReportStatus } from '../schemas/report.schema';

export class UpdateReportStatusDto {
  @IsEnum(ReportStatus, {
    message: 'Invalid report status',
  })
  status: ReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  officerNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}