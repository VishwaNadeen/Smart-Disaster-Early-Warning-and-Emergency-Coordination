import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
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
        )}`;

      callback(
        null,
        uniqueName,
      );
    },
  }),

  limits: {
    fileSize:
      5 * 1024 * 1024,
  },

  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    callback: (
      error: Error | null,
      acceptFile: boolean,
    ) => void,
  ) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (
      allowedTypes.includes(
        file.mimetype,
      )
    ) {
      callback(
        null,
        true,
      );
    } else {
      callback(
        new BadRequestException(
          'Only JPG, PNG and WEBP images are allowed',
        ),
        false,
      );
    }
  },
};

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService:
      ReportsService,
  ) {}

  @Get('districts')
  getDistricts(): Promise<{ success: boolean; data: string[] }> {
    return this.reportsService.getDistricts();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor(
      'photo',
      reportUploadOptions,
    ),
  )
  create(
    @Req() req: any,

    @Body()
    dto: CreateReportDto,

    @UploadedFile()
    photo?: Express.Multer.File,
  ) {
    return this.reportsService.create(
      req.user.id,

      dto,

      photo,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMyReports(
    @Req() req: any,
  ) {
    return this.reportsService.findMyReports(
      req.user.id,
    );
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor(
      'photo',
      reportUploadOptions,
    ),
  )
  update(
    @Req() req: any,

    @Param('id')
    id: string,

    @Body()
    dto: UpdateReportDto,

    @UploadedFile()
    photo?: Express.Multer.File,
  ) {
    return this.reportsService.update(
      req.user.id,

      id,

      dto,

      photo,
    );
  }

  @Delete('my/:id')
  @UseGuards(JwtAuthGuard)
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

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Req() req: any,

    @Query('district') district?: string,

    @Query('status') status?: string,

    @Query('hazardType') hazardType?: string,

    @Query('search') search?: string,
  ): Promise<{ success: boolean; count: number; data: any[] }> {
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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: any }> {
    return this.reportsService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatusPatch(
    @Req() req: any,

    @Param('id') id: string,

    @Body() dto: UpdateReportStatusDto,
  ): Promise<{ success: boolean; message: string; data: any }> {
    return this.reportsService.updateStatus(
      id,
      req.user.id,
      dto,
    );
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatusPut(
    @Req() req: any,

    @Param('id') id: string,

    @Body() dto: UpdateReportStatusDto,
  ): Promise<{ success: boolean; message: string; data: any }> {
    return this.reportsService.updateStatus(
      id,
      req.user.id,
      dto,
    );
  }
}