
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  FilesInterceptor,
} from '@nestjs/platform-express';

import {
  ReportsService,
} from './reports.service';

import {
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';

import {
  CreateReportDto,
} from './dto/create-report.dto';

import {
  UpdateReportDto,
} from './dto/update-report.dto';

import {
  UpdateReportStatusDto,
} from './dto/update-report-status.dto';

import {
  reportUploadOptions,
} from './upload/reports-upload.config';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService:
      ReportsService,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor(
      'attachments',
      10,
      reportUploadOptions,
    ),
  )
  create(
    @Req() req: any,

    @Body()
    dto: CreateReportDto,

    @UploadedFiles()
    files: Express.Multer.File[] = [],
  ) {
    return this.reportsService.create(
      req.user.id,
      dto,
      files,
    );
  }

  @Get('my')
  findMyReports(
    @Req() req: any,
  ) {
    return this.reportsService.findMyReports(
      req.user.id,
    );
  }

  @Get('my/:id')
  findMyReport(
    @Req() req: any,

    @Param('id')
    id: string,
  ) {
    return this.reportsService.findMyReport(
      req.user.id,
      id,
    );
  }

  @Put('my/:id')
  @UseInterceptors(
    FilesInterceptor(
      'attachments',
      10,
      reportUploadOptions,
    ),
  )
  update(
    @Req() req: any,

    @Param('id')
    id: string,

    @Body()
    dto: UpdateReportDto,

    @UploadedFiles()
    files: Express.Multer.File[] = [],
  ) {
    return this.reportsService.update(
      req.user.id,
      id,
      dto,
      files,
    );
  }

  @Delete('my/:id')
  delete(
    @Req() req: any,

    @Param('id')
    id: string,
  ) {
    return this.reportsService.delete(
      req.user.id,
      id,
    );
  }

  // Get available districts.
  @Get('districts')
  getDistricts() {
    return this.reportsService.getDistricts();
  }

  // Get all reports for the authorized officer.
  @Get()
  findAll(
    @Req() req: any,
    @Query('district') district?: string,
    @Query('status') status?: string,
    @Query('hazardType') hazardType?: string,
    @Query('search') search?: string,
  ) {
    return this.reportsService.findAll(
      req.user.id,
      {
        district,
        status,
        hazardType,
        search,
      },
    );
  }

  // Get one report for officer review.
  @Get(':id')
  findById(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.reportsService.findById(
      id,
      req.user.id,
    );
  }

  // Verify, reject, or request more information.
  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.reportsService.updateStatus(
      id,
      req.user.id,
      dto,
    );
  }
}
