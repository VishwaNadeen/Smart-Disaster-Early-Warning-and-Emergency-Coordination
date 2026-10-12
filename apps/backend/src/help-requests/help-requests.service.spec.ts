
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { HelpRequestsService } from './help-requests.service';
import {
  HelpRequestStatus,
  HelpRequestUrgency,
} from './schemas/help-request.schema';
import { UserRole } from '../users/schemas/user.schema';

describe('HelpRequestsService', () => {
  let service: HelpRequestsService;

  let requestModel: {
    create: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
  };

  let userModel: {
    findById: ReturnType<typeof vi.fn>;
  };

  let teamModel: Record<string, ReturnType<typeof vi.fn>>;

  const citizenId = '507f1f77bcf86cd799439011';

  const citizen = {
    _id: citizenId,
    id: citizenId,
    fullName: 'Test Citizen',
    email: 'citizen@example.com',
    phone: '0771234567',
    district: 'Colombo',
    livingCity: 'Colombo',
    role: UserRole.CITIZEN,
    isActive: true,
    deletedAt: undefined,
  };

  const validDto = {
    description: 'Need assistance due to flooding',
    latitude: 6.9271,
    longitude: 79.8612,
    locationDescription: 'Colombo city',
    urgency: HelpRequestUrgency.HIGH,
    district: 'Colombo',
    city: 'Colombo',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    requestModel = {
      create: vi.fn().mockResolvedValue({
        _id: 'request-123',
        requestNumber: 'HELP-TEST-1234',
        status: HelpRequestStatus.PENDING,
        description: validDto.description,
      }),
      find: vi.fn(),
    };

    userModel = {
      findById: vi.fn().mockResolvedValue(citizen),
    };

    teamModel = {};

    service = new HelpRequestsService(
      requestModel as any,
      userModel as any,
      teamModel as any,
    );
  });

  describe('create', () => {
    it('should create a help request successfully', async () => {
      const result = await service.create(
        citizenId,
        validDto as any,
      );

      expect(userModel.findById).toHaveBeenCalledWith(citizenId);

      expect(requestModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          citizenId: citizen._id,
          citizenName: citizen.fullName,
          description: validDto.description,
          urgency: HelpRequestUrgency.HIGH,
          latitude: 6.9271,
          longitude: 79.8612,
          status: HelpRequestStatus.PENDING,
        }),
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Your request for help has been sent to the DMC.',
      );
    });

    it('should reject a request when the citizen is inactive', async () => {
      userModel.findById.mockResolvedValue({
        ...citizen,
        isActive: false,
      });

      await expect(
        service.create(citizenId, validDto as any),
      ).rejects.toThrow(
        new ForbiddenException('Your account is not active.'),
      );

      expect(requestModel.create).not.toHaveBeenCalled();
    });

    it('should reject a request when the citizen has no phone number', async () => {
      userModel.findById.mockResolvedValue({
        ...citizen,
        phone: '',
      });

      await expect(
        service.create(citizenId, validDto as any),
      ).rejects.toThrow(
        new BadRequestException(
          'Please add a phone number to your profile before requesting help.',
        ),
      );

      expect(requestModel.create).not.toHaveBeenCalled();
    });

    it('should reject a request with an empty description', async () => {
      await expect(
        service.create(citizenId, {
          ...validDto,
          description: '   ',
        } as any),
      ).rejects.toThrow(
        new BadRequestException(
          'Please describe the help you need.',
        ),
      );

      expect(requestModel.create).not.toHaveBeenCalled();
    });

    it('should reject a request when only one GPS coordinate is provided', async () => {
      const invalidDto = {
        ...validDto,
        longitude: undefined,
        locationDescription: '',
      };

      await expect(
        service.create(citizenId, invalidDto as any),
      ).rejects.toThrow(
        new BadRequestException(
          'Latitude and longitude must be provided together.',
        ),
      );

      expect(requestModel.create).not.toHaveBeenCalled();
    });

    it('should reject a request without GPS or manual location', async () => {
      const invalidDto = {
        ...validDto,
        latitude: undefined,
        longitude: undefined,
        locationDescription: '   ',
      };

      await expect(
        service.create(citizenId, invalidDto as any),
      ).rejects.toThrow(
        new BadRequestException(
          'Current GPS location or a manual location description is required.',
        ),
      );

      expect(requestModel.create).not.toHaveBeenCalled();
    });
  });
});
