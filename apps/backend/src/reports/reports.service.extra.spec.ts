import { beforeEach, describe, expect, it, vi } from 'vitest';

import {

  BadRequestException,

  ConflictException,

  ForbiddenException,

  NotFoundException,

} from '@nestjs/common';

import { ReportsService } from './reports.service';

import { HazardType, ReportStatus } from './schemas/report.schema';

import { UserRole } from '../users/schemas/user.schema';

describe('ReportsService - additional coverage', () => {

  let service: ReportsService;

  let reportModel: any;

  let userModel: any;

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

function makeReport(overrides: Record<string, any> = {}) {

  return {

    _id: reportId,

    id: reportId,

    citizenId,

    hazardType: HazardType.OTHER,

    customHazardType: 'Flooding',

    description: 'Flood near the road',

    latitude: 6.9271,

    longitude: 79.8612,

    manualLocation: 'Colombo',

    district: 'Colombo',

    city: 'Colombo',

    attachments: [],

    status: ReportStatus.PENDING_VERIFICATION,

    possibleDuplicate: false,

    // Optional report fields

    rejectionReason: undefined as string | undefined,

    officerNotes: undefined as string | undefined,

    deletedAt: undefined as Date | undefined,

    save: vi.fn().mockResolvedValue(undefined),

    toObject: vi.fn().mockReturnValue({

      _id: reportId,

      citizenId,

      district: 'Colombo',

    }),

    ...overrides,

  };

}

  beforeEach(() => {

    vi.clearAllMocks();

    reportModel = {

      find: vi.fn(),

      findOne: vi.fn().mockResolvedValue(null),

      create: vi.fn(),

      distinct: vi.fn().mockResolvedValue([]),

    };

    userModel = {

      findById: vi.fn().mockResolvedValue(citizen),

      find: vi.fn(),

      distinct: vi.fn().mockResolvedValue([]),

    };

    service = new ReportsService(reportModel, userModel);

  });

  describe('create', () => {

    it('should reject a user who does not exist', async () => {

      userModel.findById.mockResolvedValue(null);

      await expect(

        service.create(citizenId, {

          hazardType: HazardType.OTHER,

          description: 'Flood',

          manualLocation: 'Colombo',

        } as any),

      ).rejects.toThrow(ForbiddenException);

      expect(reportModel.create).not.toHaveBeenCalled();

    });

    it('should detect a possible duplicate report', async () => {

      reportModel.findOne.mockResolvedValueOnce({

        _id: 'existing-report',

      });

      reportModel.create.mockResolvedValue({

        id: reportId,

        reportNumber: 'RPT-2026-123456',

        status: ReportStatus.PENDING_VERIFICATION,

        submittedAt: new Date(),

        possibleDuplicate: true,

      });

      const result = await service.create(citizenId, {

        hazardType: HazardType.OTHER,

        customHazardType: 'Flooding',

        description: 'Flood near the road',

        latitude: 6.9271,

        longitude: 79.8612,

        district: ' Colombo ',

      } as any);

      expect(result.data.possibleDuplicate).toBe(true);

      expect(reportModel.create).toHaveBeenCalledWith(

        expect.objectContaining({

          possibleDuplicate: true,

          district: 'Colombo',

        }),

      );

    });

    it('should reject when neither coordinates nor manual location is supplied', async () => {

      await expect(

        service.create(citizenId, {

          hazardType: HazardType.OTHER,

          customHazardType: 'Flooding',

          description: 'Flood near the road',

        } as any),

      ).rejects.toThrow(

        new BadRequestException(

          'Provide GPS coordinates or a manual location.',

        ),

      );

    });

    it('should reject a report without description or attachments', async () => {

      await expect(

        service.create(citizenId, {

          hazardType: HazardType.OTHER,

          customHazardType: 'Flooding',

          manualLocation: 'Colombo',

          description: '   ',

        } as any),

      ).rejects.toThrow(

        new BadRequestException(

          'At least a description or attachment is required.',

        ),

      );

    });

  });

  describe('update', () => {

    it('should update a report and return it for verification', async () => {

      const report = makeReport({

        status: ReportStatus.NEEDS_MORE_INFO,

        rejectionReason: 'Old reason',

        officerNotes: 'Old notes',

      });

      reportModel.findOne.mockResolvedValue(report);

      const result = await service.update(

        citizenId,

        reportId,

        {

          description: '  Updated description  ',

          manualLocation: '  New location  ',

          city: '  Kandy  ',

        } as any,

      );

      expect(report.description).toBe('Updated description');

      expect(report.manualLocation).toBe('New location');

      expect(report.city).toBe('Kandy');

      expect(report.status).toBe(

        ReportStatus.PENDING_VERIFICATION,

      );

      expect(report.rejectionReason).toBeUndefined();

      expect(report.officerNotes).toBeUndefined();

      expect(report.save).toHaveBeenCalledOnce();

      expect(result.success).toBe(true);

      expect(result.message).toBe(

        'Report updated and resubmitted for verification.',

      );

    });

    it('should reject an invalid report ID during update', async () => {
      await expect(
        service.update(citizenId, 'invalid-id', {} as any),
      ).rejects.toThrow(
        new BadRequestException('Invalid report ID.'),
      );
    });

    it('should reject updating a report that does not exist', async () => {

      reportModel.findOne.mockResolvedValue(null);

      await expect(

        service.update(citizenId, reportId, {} as any),

      ).rejects.toThrow(NotFoundException);

    });

    it('should reject updating a report that is already verified', async () => {

      reportModel.findOne.mockResolvedValue(

        makeReport({ status: ReportStatus.VERIFIED }),

      );

      await expect(

        service.update(citizenId, reportId, {

          description: 'Updated description',

        } as any),

      ).rejects.toThrow(

        new ConflictException('This report can no longer be edited.'),

      );

    });

  });

  describe('delete', () => {

    it('should soft-delete an editable report', async () => {

      const report = makeReport();

      reportModel.findOne.mockResolvedValue(report);

      const result = await service.delete(citizenId, reportId);

      expect(report.status).toBe(ReportStatus.DELETED);

      expect(report.deletedAt).toBeInstanceOf(Date);

      expect(report.save).toHaveBeenCalledOnce();

      expect(result.success).toBe(true);

      expect(result.message).toBe('Report deleted successfully.');

    });

    it('should reject deleting a verified report', async () => {

      reportModel.findOne.mockResolvedValue(

        makeReport({ status: ReportStatus.VERIFIED }),

      );

      await expect(

        service.delete(citizenId, reportId),

      ).rejects.toThrow(

        new ConflictException('This report can no longer be deleted.'),

      );

    });

  });

  describe('findAll', () => {

    it('should return reports for an authorized duty officer', async () => {
      userModel.findById.mockResolvedValue(officer);

      const reports = [
        {
          _id: reportId,
          citizenId,
          description: 'Flood near the road',
        },
      ];

      reportModel.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(reports),
        }),
      });

      userModel.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: citizenId,
              fullName: 'Test Citizen',
              phone: '0771234567',
              email: 'citizen@example.com',
            },
          ]),
        }),
      });

      const result = await service.findAll(officerId, {
        district: 'ALL',
        status: 'ALL',
        hazardType: 'ALL',
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].citizenName).toBe('Test Citizen');
      expect(result.data[0].citizenPhone).toBe('0771234567');
    });

    it('should reject an invalid status filter', async () => {

      userModel.findById.mockResolvedValue(officer);

      await expect(

        service.findAll(officerId, {

          status: 'NOT_A_STATUS',

        }),

      ).rejects.toThrow(

        new BadRequestException('Invalid report status filter.'),

      );

      expect(reportModel.find).not.toHaveBeenCalled();

    });

    it('should reject a citizen trying to access the officer queue', async () => {

      await expect(

        service.findAll(citizenId, {}),

      ).rejects.toThrow(

        new ForbiddenException(

          'Only authorized officers can perform this action.',

        ),

      );

      expect(reportModel.find).not.toHaveBeenCalled();

    });

  });

  describe('findById', () => {

    it('should return a report to an authorized duty officer', async () => {

    userModel.findById.mockImplementation((id: string) => {

        if (String(id) === officerId) {

        return Promise.resolve(officer);

        }

        if (String(id) === citizenId) {

        return {

            select: vi.fn().mockReturnValue({

            lean: vi.fn().mockResolvedValue({

                _id: citizenId,

                fullName: 'Test Citizen',

                email: 'citizen@example.com',

                phone: '0771234567',

                district: 'Colombo',

            }),

            }),

        };

        }

        return Promise.resolve(null);

    });

    reportModel.findOne.mockResolvedValue(makeReport());

    const result = await service.findById(reportId, officerId);

    expect(result.success).toBe(true);

    expect(result.data.citizenName).toBe('Test Citizen');

    expect(result.data.citizenEmail).toBe('citizen@example.com');

    });

    it('should reject an invalid report ID', async () => {
      userModel.findById.mockResolvedValue(officer);

      await expect(

        service.findById('invalid-id', officerId),

      ).rejects.toThrow(

        new BadRequestException('Invalid report ID.'),

      );

    });

  });

  describe('updateStatus', () => {

    it('should successfully verify a pending report', async () => {

      userModel.findById.mockResolvedValue(officer);

      const report = makeReport();

      reportModel.findOne.mockResolvedValue(report);

      const result = await service.updateStatus(

        reportId,

        officerId,

        {

          status: ReportStatus.VERIFIED,

          officerNotes: '  Checked and confirmed  ',

        } as any,

      );

      expect(report.status).toBe(ReportStatus.VERIFIED);

      expect(report.officerNotes).toBe('Checked and confirmed');

      expect(report.rejectionReason).toBeUndefined();

      expect(report.save).toHaveBeenCalledOnce();

      expect(result.success).toBe(true);

    });

    it('should reject a decision for a report not pending verification', async () => {

      userModel.findById.mockResolvedValue(officer);

      reportModel.findOne.mockResolvedValue(

        makeReport({ status: ReportStatus.VERIFIED }),

      );

      await expect(

        service.updateStatus(reportId, officerId, {

          status: ReportStatus.REJECTED,

          rejectionReason: 'Invalid report',

        } as any),

      ).rejects.toThrow(

        new ConflictException(

          'Only reports pending verification can receive a verification decision.',

        ),

      );

    });

    it('should reject an invalid verification decision', async () => {

      userModel.findById.mockResolvedValue(officer);

      reportModel.findOne.mockResolvedValue(makeReport());

      await expect(

        service.updateStatus(reportId, officerId, {

          status: ReportStatus.DRAFT,

        } as any),

      ).rejects.toThrow(

        new BadRequestException('Invalid verification decision.'),

      );

    });

  });

  describe('getDistricts', () => {

    it('should combine, deduplicate, trim and sort district names', async () => {

      reportModel.distinct.mockResolvedValue([

        ' Colombo ',

        'Kandy',

        '',

        null,

      ]);

      userModel.distinct

        .mockResolvedValueOnce(['Colombo', 'Galle'])

        .mockResolvedValueOnce(['Kandy', 'Matale']);

      const result = await service.getDistricts();

      expect(result.success).toBe(true);

      expect(result.data).toContain('Colombo');

      expect(result.data).toContain('Kandy');

      expect(result.data).toContain('Galle');

      expect(result.data).toContain('Matale');

      expect(result.data).toEqual(

        [...result.data].sort((a, b) => a.localeCompare(b)),

      );

      expect(new Set(result.data.map((d) => d.toLowerCase())).size)

        .toBe(result.data.length);

    });

  });

});
