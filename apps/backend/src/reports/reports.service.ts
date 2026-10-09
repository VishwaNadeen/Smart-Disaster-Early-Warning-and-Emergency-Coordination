import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  User,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';

import {
  CreateReportDto,
} from './dto/create-report.dto';

import {
  UpdateReportDto,
} from './dto/update-report.dto';

import {
  UpdateReportStatusDto,
} from './dto/update-report-status.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(
      DisasterReport.name,
    )
    private readonly reportModel:
      Model<ReportDocument>,

    @InjectModel(
      User.name,
    )
    private readonly userModel:
      Model<UserDocument>,
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

    const citizen = await this.userModel
      .findById(citizenId)
      .select('district')
      .lean();

    const district =
      dto.district?.trim() || citizen?.district?.trim() || undefined;
    const city = dto.city?.trim() || undefined;

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

        district,

        city,

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

    if (dto.district !== undefined) {
      report.district =
        dto.district ? dto.district.trim() : undefined;
    }

    if (dto.city !== undefined) {
      report.city =
        dto.city ? dto.city.trim() : undefined;
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

  private escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async getDistricts(): Promise<{ success: boolean; data: string[] }> {
    const reportDistricts = await this.reportModel
      .distinct('district', {
        deletedAt: { $exists: false },
        district: { $exists: true, $ne: '' },
      })
      .exec();

    const standardDistricts = [
      'Ampara',
      'Anuradhapura',
      'Badulla',
      'Batticaloa',
      'Colombo',
      'Galle',
      'Gampaha',
      'Hambantota',
      'Jaffna',
      'Kalutara',
      'Kandy',
      'Kegalle',
      'Kilinochchi',
      'Kurunegala',
      'Mannar',
      'Matale',
      'Matara',
      'Monaragala',
      'Mullaitivu',
      'Nuwara Eliya',
      'Polonnaruwa',
      'Puttalam',
      'Ratnapura',
      'Trincomalee',
      'Vavuniya',
    ];

    const districtSet = new Set<string>();

    for (const d of standardDistricts) {
      if (d && d.trim()) districtSet.add(d.trim());
    }

    if (Array.isArray(reportDistricts)) {
      for (const d of reportDistricts) {
        if (typeof d === 'string' && d.trim()) {
          districtSet.add(d.trim().charAt(0).toUpperCase() + d.trim().slice(1));
        }
      }
    }

    const userDistricts = await this.userModel
      .distinct('assignedDistricts', { isActive: true })
      .exec();
    if (Array.isArray(userDistricts)) {
      for (const d of userDistricts) {
        if (typeof d === 'string' && d.trim()) {
          districtSet.add(d.trim().charAt(0).toUpperCase() + d.trim().slice(1));
        }
      }
    }

    const userDirectDistricts = await this.userModel
      .distinct('district', { isActive: true })
      .exec();
    if (Array.isArray(userDirectDistricts)) {
      for (const d of userDirectDistricts) {
        if (typeof d === 'string' && d.trim()) {
          districtSet.add(d.trim().charAt(0).toUpperCase() + d.trim().slice(1));
        }
      }
    }

    const sorted = Array.from(districtSet).sort((a, b) => a.localeCompare(b));

    return {
      success: true,
      data: sorted,
    };
  }

  async findAll(
    userId: string,
    filters: {
      district?: string;
      status?: string;
      hazardType?: string;
      search?: string;
    },
  ): Promise<{ success: boolean; count: number; data: any[] }> {
    const actor = await this.userModel
      .findById(userId)
      .select('role district assignedDistricts isActive fullName')
      .exec();

    if (!actor || !actor.isActive) {
      throw new ForbiddenException('User is not authorized or is inactive.');
    }

    const andConditions: any[] = [{ deletedAt: { $exists: false } }];

    if (
      filters.district &&
      filters.district.trim() &&
      filters.district.trim().toUpperCase() !== 'ALL'
    ) {
      const cleanDistrict = filters.district.trim();
      const dRegex = new RegExp(
        `^${this.escapeRegex(cleanDistrict)}$`,
        'i',
      );
      const dPartial = new RegExp(
        this.escapeRegex(cleanDistrict),
        'i',
      );
      andConditions.push({
        $or: [
          { district: dRegex },
          { manualLocation: dPartial },
          { city: dRegex },
        ],
      });
    }

    if (filters.status && filters.status.toUpperCase() !== 'ALL') {
      andConditions.push({ status: filters.status });
    }

    if (filters.hazardType && filters.hazardType.toUpperCase() !== 'ALL') {
      andConditions.push({ hazardType: filters.hazardType });
    }

    if (filters.search && filters.search.trim()) {
      const searchRegex = new RegExp(
        this.escapeRegex(filters.search.trim()),
        'i',
      );
      andConditions.push({
        $or: [
          { reportNumber: searchRegex },
          { description: searchRegex },
          { manualLocation: searchRegex },
          { city: searchRegex },
          { district: searchRegex },
          { customHazardType: searchRegex },
        ],
      });
    }

    const query = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const reports = await this.reportModel
      .find(query)
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean();

    const citizenIds = [
      ...new Set(reports.map((r) => r.citizenId).filter(Boolean)),
    ];
    const citizens = await this.userModel
      .find({ _id: { $in: citizenIds } })
      .select('fullName email phone district')
      .lean();

    const citizenMap = new Map(
      citizens.map((c) => [String(c._id), c]),
    );

    const data = reports.map((report) => {
      const citizen = citizenMap.get(String(report.citizenId));
      return {
        ...report,
        citizenName: citizen?.fullName || 'Citizen User',
        citizenPhone: citizen?.phone || '—',
        citizenEmail: citizen?.email || '—',
      };
    });

    return {
      success: true,
      count: data.length,
      data,
    };
  }

  async findById(reportId: string): Promise<{ success: boolean; data: any }> {
    const report = await this.reportModel
      .findOne({
        _id: reportId,
        deletedAt: { $exists: false },
      })
      .lean();

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const citizen = await this.userModel
      .findById(report.citizenId)
      .select('fullName email phone district')
      .lean();

    return {
      success: true,
      data: {
        ...report,
        citizenName: citizen?.fullName || 'Citizen User',
        citizenPhone: citizen?.phone || '—',
        citizenEmail: citizen?.email || '—',
      },
    };
  }

  async updateStatus(
    reportId: string,
    officerId: string,
    dto: UpdateReportStatusDto,
  ): Promise<{ success: boolean; message: string; data: any }> {
    const officer = await this.userModel
      .findById(officerId)
      .select('role district assignedDistricts fullName')
      .exec();

    if (!officer) {
      throw new ForbiddenException('Officer account not found');
    }

    const report = await this.reportModel.findOne({
      _id: reportId,
      deletedAt: { $exists: false },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const isOfficer =
      officer.role === UserRole.DUTY_OFFICER ||
      officer.role === UserRole.DISTRICT_OFFICER;

    if (isOfficer && report.district) {
      const authorizedDistricts = [
        ...(officer.assignedDistricts ?? []),
        ...(officer.district ? [officer.district] : []),
      ]
        .map((d) => d?.trim().toLowerCase())
        .filter(Boolean);

      if (
        authorizedDistricts.length > 0 &&
        !authorizedDistricts.includes(report.district.trim().toLowerCase())
      ) {
        throw new ForbiddenException(
          'You can only verify or update reports in your registered district.',
        );
      }
    }

    report.status = dto.status;
    if (dto.officerNotes !== undefined) {
      report.officerNotes = dto.officerNotes;
    }
    if (dto.rejectionReason !== undefined) {
      report.rejectionReason = dto.rejectionReason;
    }

    await report.save();

    return {
      success: true,
      message: `Report status updated to ${dto.status}`,
      data: report,
    };
  }
}