
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { ReportsService } from './reports.service';
import { ReportsRepository } from './repositories/reports.repository';
import { HazardType, ReportStatus } from './schemas/report.schema';
import { UserRole } from '../users/schemas/user.schema';


describe('ReportsService - create', () => {
  let service: ReportsService;

  let reportModel: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  let userModel: {
    findById: ReturnType<typeof vi.fn>;
  };

  const citizenId = '507f1f77bcf86cd799439011';

  const mockCitizen = {
    id: citizenId,
    _id: citizenId,
    fullName: 'Test Citizen',
    email: 'citizen@example.com',
    district: 'Colombo',
    role: UserRole.CITIZEN,
    isActive: true,
  };

  const validDto = {
    hazardType: Object.values(HazardType)[0] as HazardType,
    description: 'Flooding reported near the main road',
    latitude: 6.9271,
    longitude: 79.8612,
    district: 'Colombo',
    manualLocation: 'Main road, Colombo',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    reportModel = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'report-123',
        reportNumber: 'RPT-2026-123456',
        status: ReportStatus.PENDING_VERIFICATION,
        submittedAt: new Date(),
        possibleDuplicate: false,
      }),
    };

    userModel = {
      findById: vi.fn().mockResolvedValue(mockCitizen),
    };

    service = new ReportsService(
      new ReportsRepository(reportModel as any, userModel as any),
    );
  });

  it('should create a report successfully', async () => {
    const result = await service.create(
      citizenId,
      validDto as any,
    );

    expect(userModel.findById).toHaveBeenCalledWith(citizenId);
    expect(reportModel.findOne).toHaveBeenCalled();

    expect(reportModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        citizenId,
        hazardType: validDto.hazardType,
        description: validDto.description,
        latitude: 6.9271,
        longitude: 79.8612,
        district: 'Colombo',
        status: ReportStatus.PENDING_VERIFICATION,
        possibleDuplicate: false,
      }),
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe('Report submitted successfully.');
    expect(result.data.reportId).toBe('report-123');
    expect(result.data.status).toBe(
      ReportStatus.PENDING_VERIFICATION,
    );
  });

  it('should reject a report when the citizen is inactive', async () => {
    userModel.findById.mockResolvedValue({
      ...mockCitizen,
      isActive: false,
    });

    await expect(
      service.create(citizenId, validDto as any),
    ).rejects.toThrow(
      new ForbiddenException(
        'User is not authorized or is inactive.',
      ),
    );

    expect(reportModel.create).not.toHaveBeenCalled();
  });

  it('should reject invalid GPS coordinates', async () => {
    const invalidDto = {
      ...validDto,
      latitude: 100,
    };

    await expect(
      service.create(citizenId, invalidDto as any),
    ).rejects.toThrow(
      new BadRequestException('Invalid GPS coordinates.'),
    );

    expect(reportModel.create).not.toHaveBeenCalled();
  });

  it('should require a custom hazard type when OTHER is selected', async () => {
    const otherHazardDto = {
      ...validDto,
      hazardType: HazardType.OTHER,
      customHazardType: '',
    };

    await expect(
      service.create(citizenId, otherHazardDto as any),
    ).rejects.toThrow(
      new BadRequestException(
        'Custom hazard type is required when selecting OTHER.',
      ),
    );

    expect(reportModel.create).not.toHaveBeenCalled();
  });

  
describe('ReportsService - retrieval and status', () => {
  let service: ReportsService;

  const citizenId = '507f1f77bcf86cd799439011';
  const officerId = '507f1f77bcf86cd799439012';
  const reportId = '507f1f77bcf86cd799439013';

  const citizen = {
    _id: citizenId,
    id: citizenId,
    role: UserRole.CITIZEN,
    isActive: true,
    district: 'Colombo',
  };

  const officer = {
    _id: officerId,
    id: officerId,
    role: UserRole.DUTY_OFFICER,
    isActive: true,
  };

  let reportModel: any;
  let userModel: any;

  beforeEach(() => {
    vi.clearAllMocks();

    reportModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
    };

    userModel = {
      findById: vi.fn().mockResolvedValue(citizen),
    };

    service = new ReportsService(
      new ReportsRepository(reportModel, userModel),
    );
  });

  it('should retrieve a citizen report list', async () => {
    const reports = [
      { _id: reportId, description: 'Flood near the road' },
    ];

    reportModel.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(reports),
      }),
    });

    const result = await service.findMyReports(citizenId);

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(result.data).toEqual(reports);

    expect(reportModel.find).toHaveBeenCalledWith({
      citizenId,
      deletedAt: { $exists: false },
    });
  });

  it('should reject retrieval when the citizen is inactive', async () => {
    userModel.findById.mockResolvedValue({
      ...citizen,
      isActive: false,
    });

    await expect(
      service.findMyReports(citizenId),
    ).rejects.toThrow(
      new ForbiddenException(
        'User is not authorized or is inactive.',
      ),
    );

    expect(reportModel.find).not.toHaveBeenCalled();
  });

  it('should retrieve one report belonging to the citizen', async () => {
    const report = {
      _id: reportId,
      citizenId,
      description: 'Flood near the road',
    };

    reportModel.findOne.mockResolvedValue(report);

    const result = await service.findMyReport(
      citizenId,
      reportId,
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(report);

    expect(reportModel.findOne).toHaveBeenCalledWith({
      _id: reportId,
      citizenId,
      deletedAt: { $exists: false },
    });
  });

  it('should reject an invalid report ID', async () => {
    await expect(
      service.findMyReport(citizenId, 'invalid-id'),
    ).rejects.toThrow(
      new BadRequestException('Invalid report ID.'),
    );

    expect(reportModel.findOne).not.toHaveBeenCalled();
  });

  it('should reject retrieval when the report does not exist', async () => {
    reportModel.findOne.mockResolvedValue(null);

    await expect(
      service.findMyReport(citizenId, reportId),
    ).rejects.toThrow(
      new (await import('@nestjs/common')).NotFoundException(
        'Report not found.',
      ),
    );
  });

  it('should require a rejection reason when rejecting a report', async () => {
    const report = {
      _id: reportId,
      citizenId,
      district: 'Colombo',
      status: ReportStatus.PENDING_VERIFICATION,
      save: vi.fn(),
    };

    userModel.findById.mockResolvedValue(officer);
    reportModel.findOne.mockResolvedValue(report);

    await expect(
      service.updateStatus(reportId, officerId, {
        status: ReportStatus.REJECTED,
        rejectionReason: '',
      } as any),
    ).rejects.toThrow(
      new BadRequestException(
        'A rejection reason is required.',
      ),
    );

    expect(report.save).not.toHaveBeenCalled();
  });

  it('should require officer notes when requesting more information', async () => {
    const report = {
      _id: reportId,
      citizenId,
      district: 'Colombo',
      status: ReportStatus.PENDING_VERIFICATION,
      save: vi.fn(),
    };

    userModel.findById.mockResolvedValue(officer);
    reportModel.findOne.mockResolvedValue(report);

    await expect(
      service.updateStatus(reportId, officerId, {
        status: ReportStatus.NEEDS_MORE_INFO,
        officerNotes: '   ',
      } as any),
    ).rejects.toThrow(
      new BadRequestException(
        'Officer notes are required when requesting more information.',
      ),
    );

    expect(report.save).not.toHaveBeenCalled();
  });
});
});
