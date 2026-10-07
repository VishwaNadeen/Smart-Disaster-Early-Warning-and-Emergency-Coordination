import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  DisasterReport,
  ReportDocument,
  ReportStatus,
  HazardType,
} from './schemas/report.schema';

import {
  CreateReportDto,
} from './dto/create-report.dto';

import {
  UpdateReportDto,
} from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(
      DisasterReport.name,
    )
    private readonly reportModel:
      Model<ReportDocument>,
  ) {}

  private generateReportNumber() {
    const year =
      new Date().getFullYear();

    const random =
      Math.floor(
        100000 +
          Math.random() * 900000,
      );

    return `RPT-${year}-${random}`;
  }

  async create(
    citizenId: string,

    dto: CreateReportDto,

    photo?: Express.Multer.File,
  ) {
    /*
     * The project use case requires:
     * hazard type
     * location
     * photo and/or description
     */

    if (
      !dto.latitude &&
      !dto.longitude &&
      !dto.manualLocation
    ) {
      throw new BadRequestException(
        'Location is required',
      );
    }

    if (
      (dto.latitude &&
        !dto.longitude) ||
      (!dto.latitude &&
        dto.longitude)
    ) {
      throw new BadRequestException(
        'Both latitude and longitude are required',
      );
    }

    if (
      !dto.description &&
      !photo
    ) {
      throw new BadRequestException(
        'At least a description or photo is required',
      );
    }

    if (
      dto.hazardType === 'OTHER' &&
      !dto.customHazardType
    ) {
      throw new BadRequestException(
        'Custom hazard type is required when selecting OTHER',
      );
    }

    const possibleDuplicate =
      await this.checkDuplicate(
        dto,
      );

    const report =
      await this.reportModel.create({
        reportNumber:
          this.generateReportNumber(),

        citizenId,

        hazardType:
          dto.hazardType,

        customHazardType:
          dto.customHazardType,

        description:
          dto.description,

        photoUrl: photo
          ? `/uploads/reports/${photo.filename}`
          : undefined,

        latitude:
          dto.latitude
            ? Number(dto.latitude)
            : undefined,

        longitude:
          dto.longitude
            ? Number(dto.longitude)
            : undefined,

        manualLocation:
          dto.manualLocation,

        status:
          ReportStatus.PENDING_VERIFICATION,

        possibleDuplicate,

        submittedAt:
          new Date(),
      });

    /*
     * This response is the confirmation
     * used by the frontend confirmation screen.
     */

    return {
      success: true,

      message:
        'Report submitted successfully',

      data: {
        reportId:
          report.id,

        reportNumber:
          report.reportNumber,

        status:
          report.status,

        submittedAt:
          report.submittedAt,

        possibleDuplicate:
          report.possibleDuplicate,
      },
    };
  }

  async findMyReports(
    citizenId: string,
  ) {
    const reports =
      await this.reportModel
        .find({
          citizenId,

          deletedAt: {
            $exists: false,
          },
        })
        .sort({
          submittedAt: -1,
        })
        .lean();

    return {
      success: true,

      data: reports,
    };
  }

  async findMyReport(
    citizenId: string,

    reportId: string,
  ) {
    const report =
      await this.reportModel.findOne({
        _id: reportId,

        citizenId,

        deletedAt: {
          $exists: false,
        },
      });

    if (!report) {
      throw new NotFoundException(
        'Report not found',
      );
    }

    return {
      success: true,

      data: report,
    };
  }

  async update(
    citizenId: string,

    reportId: string,

    dto: UpdateReportDto,

    photo?: Express.Multer.File,
  ) {
    const report =
      await this.reportModel.findOne({
        _id: reportId,

        citizenId,

        deletedAt: {
          $exists: false,
        },
      });

    if (!report) {
      throw new NotFoundException(
        'Report not found',
      );
    }

    const editableStatuses = [
      ReportStatus.DRAFT,

      ReportStatus.PENDING_SYNC,

      ReportStatus.PENDING_VERIFICATION,

      ReportStatus.NEEDS_MORE_INFO,
    ];

    if (
      !editableStatuses.includes(
        report.status,
      )
    ) {
      throw new ConflictException(
        'This report can no longer be edited',
      );
    }

    const description =
      dto.description !== undefined
        ? dto.description
        : report.description;

    const hasPhoto =
      photo ||
      report.photoUrl;

    if (
      !description &&
      !hasPhoto
    ) {
      throw new BadRequestException(
        'At least a description or photo is required',
      );
    }

    if (
      dto.hazardType ===
        HazardType.OTHER &&
      !dto.customHazardType
    ) {
      throw new BadRequestException(
        'Custom hazard type is required',
      );
    }

    if (
      dto.latitude &&
      !dto.longitude
    ) {
      throw new BadRequestException(
        'Both latitude and longitude are required',
      );
    }

    if (
      !dto.latitude &&
      dto.longitude
    ) {
      throw new BadRequestException(
        'Both latitude and longitude are required',
      );
    }

    if (
      dto.hazardType !==
        undefined
    ) {
      report.hazardType =
        dto.hazardType;
    }

    if (
      dto.customHazardType !==
      undefined
    ) {
      report.customHazardType =
        dto.customHazardType;
    }

    if (
      dto.description !==
      undefined
    ) {
      report.description =
        dto.description;
    }

    if (
      dto.latitude !==
      undefined
    ) {
      report.latitude =
        dto.latitude
          ? Number(dto.latitude)
          : undefined;
    }

    if (
      dto.longitude !==
      undefined
    ) {
      report.longitude =
        dto.longitude
          ? Number(dto.longitude)
          : undefined;
    }

    if (
      dto.manualLocation !==
      undefined
    ) {
      report.manualLocation =
        dto.manualLocation;
    }

    if (photo) {
      report.photoUrl =
        `/uploads/reports/${photo.filename}`;
    }

    /*
     * Citizen has changed the report.
     * It goes back into the officer verification queue.
     */

    report.status =
      ReportStatus.PENDING_VERIFICATION;

    report.rejectionReason =
      undefined;

    report.officerNotes =
      undefined;

    report.possibleDuplicate =
      await this.checkDuplicate({
        hazardType:
          report.hazardType,

        latitude:
          report.latitude?.toString(),

        longitude:
          report.longitude?.toString(),
      });
      
    await report.save();

    return {
      success: true,

      message:
        'Report updated and resubmitted for verification',

      data: report,
    };
  }

  async delete(
    citizenId: string,

    reportId: string,
  ) {
    const report =
      await this.reportModel.findOne({
        _id: reportId,

        citizenId,

        deletedAt: {
          $exists: false,
        },
      });

    if (!report) {
      throw new NotFoundException(
        'Report not found',
      );
    }

    const deletableStatuses = [
      ReportStatus.DRAFT,

      ReportStatus.PENDING_SYNC,

      ReportStatus.PENDING_VERIFICATION,

      ReportStatus.NEEDS_MORE_INFO,
    ];

    if (
      !deletableStatuses.includes(
        report.status,
      )
    ) {
      throw new ConflictException(
        'This report can no longer be deleted',
      );
    }

    report.status =
      ReportStatus.DELETED;

    report.deletedAt =
      new Date();

    await report.save();

    return {
      success: true,

      message:
        'Report deleted successfully',
    };
  }

  private async checkDuplicate(
    dto: Partial<CreateReportDto>,
  ): Promise<boolean> {
    if (
      dto.latitude ===
        undefined ||
      dto.longitude ===
        undefined
    ) {
      return false;
    }

    const latitude =
      Number(dto.latitude);

    const longitude =
      Number(dto.longitude);

    /*
     * Approximately 1 km-ish bounding box.
     *
     * This is only a possible duplicate.
     * It does NOT reject the citizen's report.
     */

    const range =
      0.01;

    const existing =
      await this.reportModel.findOne({
        hazardType:
          dto.hazardType,

        status: {
          $in: [
            ReportStatus.PENDING_VERIFICATION,

            ReportStatus.VERIFIED,
          ],
        },

        latitude: {
          $gte:
            latitude - range,

          $lte:
            latitude + range,
        },

        longitude: {
          $gte:
            longitude - range,

          $lte:
            longitude + range,
        },
      });

    return !!existing;
  }
}