import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportStatus } from '../schemas/report.schema';

export class UpdateReportStatusDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsOptional()
  @IsString()
  officerNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
