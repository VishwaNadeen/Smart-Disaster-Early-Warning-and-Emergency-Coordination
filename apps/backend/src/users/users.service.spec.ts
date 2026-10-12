
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { UserRole } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;

  const userModel = {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  };

  const userId = '507f1f77bcf86cd799439011';

  const mockUser = {
    _id: userId,
    id: userId,
    fullName: 'Test Citizen',
    email: 'citizen@example.com',
    phone: '0771234567',
    role: UserRole.CITIZEN,
    isActive: true,
    address: 'Colombo',
    district: 'Colombo',
    passwordHash: 'hashed-password',
    save: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new UsersService(userModel as any);
  });

  // -----------------------------------------
  // GET PROFILE
  // -----------------------------------------

  describe('getProfile', () => {
    it('should return the profile without passwordHash', async () => {
      const profile = { ...mockUser };
      delete (profile as any).passwordHash;

      userModel.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(profile),
          }),
        }),
      });

      const result = await service.getProfile(userId);

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('citizen@example.com');
      expect(result.data).not.toHaveProperty('passwordHash');

      expect(userModel.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      userModel.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(service.getProfile(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should remove address and district for a duty officer', async () => {
      const officer = {
        ...mockUser,
        role: UserRole.DUTY_OFFICER,
        address: 'Private address',
        district: 'Colombo',
      };

      userModel.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(officer),
          }),
        }),
      });

      const result = await service.getProfile(userId);

      expect(result.data).not.toHaveProperty('address');
      expect(result.data).not.toHaveProperty('district');
    });
  });

  // -----------------------------------------
  // UPDATE PROFILE
  // -----------------------------------------

  describe('updateProfile', () => {
    it('should update a citizen profile successfully', async () => {
      const updatedUser = {
        ...mockUser,
        fullName: 'Updated Citizen',
      };
      delete (updatedUser as any).passwordHash;

      userModel.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            role: UserRole.CITIZEN,
          }),
        }),
      });

      userModel.findByIdAndUpdate.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(updatedUser),
        }),
      });

      const dto = {
        fullName: 'Updated Citizen',
      };

      const result = await service.updateProfile(userId, dto as any);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Profile updated successfully');
      expect(result.data.fullName).toBe('Updated Citizen');

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { $set: dto },
        { new: true, runValidators: true },
      );

      expect(result.data).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException when the existing user does not exist', async () => {
      userModel.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.updateProfile(userId, { fullName: 'Updated' } as any),
      ).rejects.toThrow(NotFoundException);

      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should reject generic profile updates for duty officers', async () => {
      userModel.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            role: UserRole.DUTY_OFFICER,
          }),
        }),
      });

      await expect(
        service.updateProfile(userId, { fullName: 'Updated' } as any),
      ).rejects.toThrow(BadRequestException);

      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if the user disappears during update', async () => {
      userModel.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            role: UserRole.CITIZEN,
          }),
        }),
      });

      userModel.findByIdAndUpdate.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.updateProfile(userId, { fullName: 'Updated' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------
  // DELETE / DEACTIVATE ACCOUNT
  // -----------------------------------------

  describe('deleteAccount', () => {
    it('should deactivate an account successfully', async () => {
      const user = {
        ...mockUser,
        isActive: true,
        deletedAt: undefined,
        save: vi.fn().mockResolvedValue(undefined),
      };

      userModel.findById.mockResolvedValue(user);

      const result = await service.deleteAccount(userId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Account deactivated successfully');

      expect(user.isActive).toBe(false);
      expect(user.deletedAt).toBeInstanceOf(Date);
      expect(user.save).toHaveBeenCalledOnce();
      expect(userModel.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when the account does not exist', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(service.deleteAccount(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
