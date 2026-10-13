import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import {
  ReportDocument,
  ReportStatus,
  HazardType,
} from './schemas/report.schema';

import {
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';
import { ReportsRepository } from './repositories/reports.repository';

import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';

// ==================================================
// CONSTANTS (Open/Closed + no magic values)
// ==================================================

const EDITABLE_STATUSES: ReportStatus[] = [
  ReportStatus.DRAFT,
  ReportStatus.PENDING_SYNC,
  ReportStatus.PENDING_VERIFICATION,
  ReportStatus.NEEDS_MORE_INFO,
];

const DELETABLE_STATUSES: ReportStatus[] = [
  ReportStatus.DRAFT,
  ReportStatus.PENDING_SYNC,
  ReportStatus.PENDING_VERIFICATION,
  ReportStatus.NEEDS_MORE_INFO,
];

const VERIFICATION_DECISIONS: ReportStatus[] = [
  ReportStatus.VERIFIED,
  ReportStatus.REJECTED,
  ReportStatus.NEEDS_MORE_INFO,
];

const STANDARD_DISTRICTS = [
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
] as const;

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
  ) {}

  // ==================================================
  // LOW-LEVEL HELPERS
  // ==================================================

  private generateReportNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `RPT-${year}-${random}`;
  }

  private getAttachmentUrl(file: Express.Multer.File): string {
    return `/uploads/reports/${file.filename}`;
  }

  private isValidId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private normalizeDistrict(district?: string): string | undefined {
    return district?.trim() || undefined;
  }

  private hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  // ==================================================
  // VALIDATION HELPERS (SRP + DRY)
  // ==================================================

  private parseAndValidateCoordinates(
    latitude?: number | string,
    longitude?: number | string,
  ): { latitude?: number; longitude?: number } {
    const hasLat = this.hasValue(latitude);
    const hasLng = this.hasValue(longitude);

    if (hasLat !== hasLng) {
      throw new BadRequestException(
        'Both latitude and longitude are required.',
      );
    }

    if (!hasLat || !hasLng) {
      return { latitude: undefined, longitude: undefined };
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      throw new BadRequestException('Invalid GPS coordinates.');
    }

    return { latitude: lat, longitude: lng };
  }

  private assertHasLocation(
    latitude?: number,
    longitude?: number,
    manualLocation?: string,
  ): void {
    if (
      (latitude === undefined || longitude === undefined) &&
      !manualLocation?.trim()
    ) {
      throw new BadRequestException(
        'Provide GPS coordinates or a manual location.',
      );
    }
  }

  private assertHasContent(
    description?: string,
    existingAttachments: string[] = [],
    photoUrl?: string,
    newFilesCount = 0,
  ): void {
    if (
      !description?.trim() &&
      existingAttachments.length === 0 &&
      !photoUrl &&
      newFilesCount === 0
    ) {
      throw new BadRequestException(
        'At least a description or attachment is required.',
      );
    }
  }

  private assertValidHazardType(
    hazardType: HazardType,
    customHazardType?: string,
  ): void {
    if (hazardType === HazardType.OTHER && !customHazardType?.trim()) {
      throw new BadRequestException(
        'Custom hazard type is required when selecting OTHER.',
      );
    }
  }

  // ==================================================
  // AUTHORIZATION HELPERS
  // ==================================================

  private async getActiveUser(userId: string): Promise<UserDocument> {
    if (!this.isValidId(userId)) {
      throw new ForbiddenException('Invalid authenticated user.');
    }

    const user = await this.reportsRepository.findActiveUser(userId);

    if (!user || user.isActive === false) {
      throw new ForbiddenException(
        'User is not authorized or is inactive.',
      );
    }

    return user;
  }

  private async getAuthorizedOfficer(
    officerId: string,
  ): Promise<UserDocument> {
    const officer = await this.getActiveUser(officerId);

    if (
      officer.role !== UserRole.DUTY_OFFICER &&
      officer.role !== UserRole.DISTRICT_OFFICER
    ) {
      throw new ForbiddenException(
        'Only authorized officers can perform this action.',
      );
    }

    return officer;
  }

  private async findActiveReport(
    reportId: string,
  ): Promise<ReportDocument> {
    if (!this.isValidId(reportId)) {
      throw new BadRequestException('Invalid report ID.');
    }

    const report = await this.reportsRepository.findActiveReport(reportId);

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return report;
  }

  private getOfficerDistricts(officer: UserDocument): string[] {
    return [
      ...(officer.assignedDistricts ?? []),
      ...(officer.district ? [officer.district] : []),
    ]
      .map((d) => d?.trim().toLowerCase())
      .filter(Boolean);
  }

  private async assertOfficerCanAccessReport(
    officer: UserDocument,
    report: ReportDocument,
  ): Promise<void> {
    if (officer.role === UserRole.DUTY_OFFICER) {
      return;
    }

    const assignedDistricts = this.getOfficerDistricts(officer);

    if (assignedDistricts.length === 0) {
      throw new ForbiddenException(
        'No district has been assigned to this officer.',
      );
    }

    const reportDistrict = report.district?.trim().toLowerCase();

    if (!reportDistrict || !assignedDistricts.includes(reportDistrict)) {
      throw new ForbiddenException(
        'You cannot access reports outside your assigned district.',
      );
    }
  }

  // ==================================================
  // DUPLICATE DETECTION
  // ==================================================

  private async checkDuplicate(params: {
    hazardType?: HazardType;
    latitude?: number;
    longitude?: number;
  }): Promise<boolean> {
    if (
      params.latitude === undefined ||
      params.longitude === undefined
    ) {
      return false;
    }

    const { latitude, longitude } = params;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return false;
    }

    return this.reportsRepository.findPotentialDuplicate({
      hazardType: params.hazardType,
      latitude,
      longitude,
    });
  }

  // ==================================================
  // DISTRICTS
  // ==================================================

  async getDistricts(): Promise<{ success: boolean; data: string[] }> {
    const [reportDistricts, userDistricts, assignedDistricts] =
      await this.reportsRepository.getDistrictSources();

    const districtMap = new Map<string, string>();

    for (const value of [
      ...STANDARD_DISTRICTS,
      ...reportDistricts,
      ...userDistricts,
      ...assignedDistricts,
    ]) {
      if (typeof value !== 'string' || !value.trim()) {
        continue;
      }

      const cleaned = value.trim();
      const key = cleaned.toLowerCase();

      if (!districtMap.has(key)) {
        districtMap.set(key, cleaned);
      }
    }

    return {
      success: true,
      data: Array.from(districtMap.values()).sort((a, b) =>
        a.localeCompare(b),
      ),
    };
  }

  // ==================================================
  // CITIZEN: CREATE REPORT
  // ==================================================

  async create(
    citizenId: string,
    dto: CreateReportDto,
    files: Express.Multer.File[] = [],
  ) {
    const citizen = await this.getActiveUser(citizenId);

    const { latitude, longitude } = this.parseAndValidateCoordinates(
      dto.latitude,
      dto.longitude,
    );

    const manualLocation = dto.manualLocation?.trim();

    this.assertHasLocation(latitude, longitude, manualLocation);
    this.assertHasContent(dto.description, [], undefined, files.length);
    this.assertValidHazardType(dto.hazardType, dto.customHazardType);

    const possibleDuplicate = await this.checkDuplicate({
      hazardType: dto.hazardType,
      latitude,
      longitude,
    });

    const attachmentUrls = files.map((file) => this.getAttachmentUrl(file));
    const firstImage = files.find((file) =>
      file.mimetype.startsWith('image/'),
    );

    const report = await this.reportsRepository.createReport({
      reportNumber: this.generateReportNumber(),
      citizenId,
      hazardType: dto.hazardType,
      customHazardType:
        dto.hazardType === HazardType.OTHER
          ? dto.customHazardType?.trim()
          : undefined,
      description: dto.description?.trim(),
      photoUrl: firstImage
        ? this.getAttachmentUrl(firstImage)
        : undefined,
      attachments: attachmentUrls,
      latitude,
      longitude,
      manualLocation,
      district: this.normalizeDistrict(dto.district || citizen.district),
      city: dto.city?.trim() || undefined,
      status: ReportStatus.PENDING_VERIFICATION,
      possibleDuplicate,
      submittedAt: new Date(),
    });

    return {
      success: true,
      message: 'Report submitted successfully.',
      data: {
        reportId: report.id,
        reportNumber: report.reportNumber,
        status: report.status,
        submittedAt: report.submittedAt,
        possibleDuplicate: report.possibleDuplicate,
      },
    };
  }

  // ==================================================
  // CITIZEN: MY REPORTS
  // ==================================================

  async findMyReports(citizenId: string) {
    await this.getActiveUser(citizenId);

    const reports = await this.reportsRepository.findReportsByCitizen(citizenId);

    return {
      success: true,
      count: reports.length,
      data: reports,
    };
  }

  async findMyReport(citizenId: string, reportId: string) {
    await this.getActiveUser(citizenId);

    if (!this.isValidId(reportId)) {
      throw new BadRequestException('Invalid report ID.');
    }

    const report = await this.reportsRepository.findCitizenReport(citizenId, reportId);

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return {
      success: true,
      data: report,
    };
  }

  // ==================================================
  // CITIZEN: UPDATE AND RESUBMIT
  // ==================================================

  async update(
    citizenId: string,
    reportId: string,
    dto: UpdateReportDto,
    files: Express.Multer.File[] = [],
  ) {
    await this.getActiveUser(citizenId);

    if (!this.isValidId(reportId)) {
      throw new BadRequestException('Invalid report ID.');
    }

    const report = await this.reportsRepository.findCitizenReport(citizenId, reportId);

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    if (!EDITABLE_STATUSES.includes(report.status)) {
      throw new ConflictException(
        'This report can no longer be edited.',
      );
    }

    // ---- Apply updates ----

    const description =
      dto.description !== undefined
        ? dto.description?.trim()
        : report.description;

    this.assertHasContent(
      description,
      report.attachments ?? [],
      report.photoUrl,
      files.length,
    );

    const nextHazardType = dto.hazardType ?? report.hazardType;
    const nextCustomHazardType =
      dto.customHazardType !== undefined
        ? dto.customHazardType
        : report.customHazardType;

    this.assertValidHazardType(nextHazardType, nextCustomHazardType);

    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      const coords = this.parseAndValidateCoordinates(
        dto.latitude,
        dto.longitude,
      );
      report.latitude = coords.latitude;
      report.longitude = coords.longitude;
    }

    if (dto.hazardType !== undefined) {
      report.hazardType = dto.hazardType;
    }

    if (dto.customHazardType !== undefined) {
      report.customHazardType =
        dto.customHazardType.trim() || undefined;
    }

    if (dto.description !== undefined) {
      report.description = description;
    }

    if (dto.manualLocation !== undefined) {
      report.manualLocation =
        dto.manualLocation.trim() || undefined;
    }

    if (dto.district !== undefined) {
      report.district = this.normalizeDistrict(dto.district);
    }

    if (dto.city !== undefined) {
      report.city = dto.city.trim() || undefined;
    }

    if (files.length > 0) {
      const newAttachmentUrls = files.map((file) =>
        this.getAttachmentUrl(file),
      );

      report.attachments = [
        ...(report.attachments ?? []),
        ...newAttachmentUrls,
      ];

      const firstNewImage = files.find((file) =>
        file.mimetype.startsWith('image/'),
      );

      if (firstNewImage) {
        report.photoUrl = this.getAttachmentUrl(firstNewImage);
      }
    }

    this.assertHasLocation(
      report.latitude,
      report.longitude,
      report.manualLocation,
    );

    report.possibleDuplicate = await this.checkDuplicate({
      hazardType: report.hazardType,
      latitude: report.latitude,
      longitude: report.longitude,
    });

    // Return edited reports to the verification queue
    report.status = ReportStatus.PENDING_VERIFICATION;
    report.rejectionReason = undefined;
    report.officerNotes = undefined;

    await report.save();

    return {
      success: true,
      message: 'Report updated and resubmitted for verification.',
      data: report,
    };
  }

  // ==================================================
  // CITIZEN: DELETE REPORT
  // ==================================================

  async delete(citizenId: string, reportId: string) {
    await this.getActiveUser(citizenId);

    if (!this.isValidId(reportId)) {
      throw new BadRequestException('Invalid report ID.');
    }

    const report = await this.reportsRepository.findCitizenReport(citizenId, reportId);

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    if (!DELETABLE_STATUSES.includes(report.status)) {
      throw new ConflictException(
        'This report can no longer be deleted.',
      );
    }

    report.status = ReportStatus.DELETED;
    report.deletedAt = new Date();

    await report.save();

    return {
      success: true,
      message: 'Report deleted successfully.',
    };
  }

  // ==================================================
  // OFFICER: REPORT QUEUE
  // ==================================================

  async findAll(
    userId: string,
    filters: {
      district?: string;
      status?: string;
      hazardType?: string;
      search?: string;
    },
  ): Promise<{ success: boolean; count: number; data: any[] }> {
    const officer = await this.getAuthorizedOfficer(userId);

    const conditions: any[] = [{ deletedAt: { $exists: false } }];

    if (
      filters.district?.trim() &&
      filters.district.trim().toUpperCase() !== 'ALL'
    ) {
      const district = this.escapeRegex(filters.district.trim());

      conditions.push({
        $or: [
          { district: new RegExp(`^${district}$`, 'i') },
          { city: new RegExp(`^${district}$`, 'i') },
          { manualLocation: new RegExp(district, 'i') },
        ],
      });
    }

    if (
      filters.status?.trim() &&
      filters.status.trim().toUpperCase() !== 'ALL'
    ) {
      if (
        !Object.values(ReportStatus).includes(
          filters.status as ReportStatus,
        )
      ) {
        throw new BadRequestException('Invalid report status filter.');
      }
      conditions.push({ status: filters.status });
    }

    if (
      filters.hazardType?.trim() &&
      filters.hazardType.trim().toUpperCase() !== 'ALL'
    ) {
      if (
        !Object.values(HazardType).includes(
          filters.hazardType as HazardType,
        )
      ) {
        throw new BadRequestException('Invalid hazard type filter.');
      }
      conditions.push({ hazardType: filters.hazardType });
    }

    if (filters.search?.trim()) {
      const search = new RegExp(
        this.escapeRegex(filters.search.trim()),
        'i',
      );

      conditions.push({
        $or: [
          { reportNumber: search },
          { description: search },
          { manualLocation: search },
          { city: search },
          { district: search },
          { customHazardType: search },
        ],
      });
    }

    if (officer.role === UserRole.DISTRICT_OFFICER) {
      const districts = this.getOfficerDistricts(officer);

      if (districts.length === 0) {
        throw new ForbiddenException(
          'No district has been assigned to this officer.',
        );
      }

      conditions.push({
        district: {
          $in: districts.map(
            (d) => new RegExp(`^${this.escapeRegex(d)}$`, 'i'),
          ),
        },
      });
    }

    const reports = await this.reportsRepository.findOfficerReports(conditions);

    const citizenIds = [
      ...new Set(
        reports
          .map((r) => String(r.citizenId))
          .filter((id) => Types.ObjectId.isValid(id)),
      ),
    ];

    const citizens = citizenIds.length
      ? await this.reportsRepository.findCitizensByIds(citizenIds)
      : [];

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

  // ==================================================
  // OFFICER: VIEW ONE REPORT
  // ==================================================

  async findById(
    reportId: string,
    officerId: string,
  ): Promise<{ success: boolean; data: any }> {
    const officer = await this.getAuthorizedOfficer(officerId);
    const report = await this.findActiveReport(reportId);

    await this.assertOfficerCanAccessReport(officer, report);

    const citizen = await this.reportsRepository.findCitizenSummary(
      String(report.citizenId),
    );

    return {
      success: true,
      data: {
        ...report.toObject(),
        citizenName: citizen?.fullName || 'Citizen User',
        citizenPhone: citizen?.phone || '—',
        citizenEmail: citizen?.email || '—',
      },
    };
  }

  // ==================================================
  // OFFICER: VERIFY / REJECT / REQUEST MORE INFO
  // ==================================================

  async updateStatus(
    reportId: string,
    officerId: string,
    dto: UpdateReportStatusDto,
  ): Promise<{ success: boolean; message: string; data: any }> {
    const officer = await this.getAuthorizedOfficer(officerId);
    const report = await this.findActiveReport(reportId);

    await this.assertOfficerCanAccessReport(officer, report);

    if (!VERIFICATION_DECISIONS.includes(dto.status)) {
      throw new BadRequestException('Invalid verification decision.');
    }

    if (report.status !== ReportStatus.PENDING_VERIFICATION) {
      throw new ConflictException(
        'Only reports pending verification can receive a verification decision.',
      );
    }

    if (
      dto.status === ReportStatus.REJECTED &&
      !dto.rejectionReason?.trim()
    ) {
      throw new BadRequestException('A rejection reason is required.');
    }

    if (
      dto.status === ReportStatus.NEEDS_MORE_INFO &&
      !dto.officerNotes?.trim()
    ) {
      throw new BadRequestException(
        'Officer notes are required when requesting more information.',
      );
    }

    report.status = dto.status;
    report.officerNotes = dto.officerNotes?.trim() || undefined;
    report.rejectionReason =
      dto.status === ReportStatus.REJECTED
        ? dto.rejectionReason?.trim()
        : undefined;

    await report.save();

    return {
      success: true,
      message: `Report status updated to ${dto.status}.`,
      data: report,
    };
  }
}