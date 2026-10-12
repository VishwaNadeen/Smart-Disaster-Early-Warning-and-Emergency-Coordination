
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { ReportsService } from './reports.service';
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
      reportModel as any,
      userModel as any,
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
});
