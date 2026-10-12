
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  FilesInterceptor,
} from '@nestjs/platform-express';

import {
  diskStorage,
} from 'multer';

import {
  extname,
} from 'path';

import {
  mkdirSync,
} from 'fs';

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
  Patch,
  Query,
} from '@nestjs/common';

import {
  UpdateReportStatusDto,
} from './dto/update-report-status.dto';

const uploadDirectory =
  './uploads/reports';

mkdirSync(
  uploadDirectory,
  {
    recursive: true,
  },
);

const allowedMimeTypes = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/heic',
  'image/heif',
  'image/avif',

  // Videos
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/3gpp',

  // Documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const allowedExtensions = new Set([
  // Images
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.heic',
  '.heif',
  '.avif',

  // Videos
  '.mp4',
  '.mov',
  '.m4v',
  '.avi',
  '.mkv',
  '.webm',
  '.3gp',

  // Documents
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
]);

const reportUploadOptions = {
  storage: diskStorage({
    destination:
      uploadDirectory,

    filename: (
      _req: any,
      file: Express.Multer.File,
      callback: (
        error: Error | null,
        filename: string,
      ) => void,
    ) => {
      const uniqueName =
        `${Date.now()}-${Math.round(
          Math.random() * 1e9,
        )}${extname(
          file.originalname,
        ).toLowerCase()}`;

      callback(
        null,
        uniqueName,
      );
    },
  }),

  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 10,
  },

  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    callback: (
      error: Error | null,
      acceptFile: boolean,
    ) => void,
  ) => {
    // Temporary debugging information.
    console.log(
      'Uploaded file:',
      file.originalname,
      'MIME type:',
      file.mimetype,
    );

    const extension = extname(
      file.originalname,
    ).toLowerCase();

    const hasAllowedMimeType =
      allowedMimeTypes.has(
        file.mimetype,
      );

    const hasAllowedExtension =
      allowedExtensions.has(
        extension,
      );

    // Accept recognized MIME types, or generic binary
    // MIME types when the extension is supported.
    if (
      hasAllowedMimeType ||
      (
        file.mimetype ===
          'application/octet-stream' &&
        hasAllowedExtension
      )
    ) {
      callback(
        null,
        true,
      );
    } else {
      callback(
        new BadRequestException(
          `Unsupported file type: ${file.mimetype}`,
        ),
        false,
      );
    }
  },
};

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
