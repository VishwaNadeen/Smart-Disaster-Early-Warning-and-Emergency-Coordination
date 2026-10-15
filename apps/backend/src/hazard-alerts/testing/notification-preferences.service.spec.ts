import { BadRequestException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationPreferencesService } from '../notification-preferences.service';

describe('NotificationPreferencesService', () => {
  let users: { findByIdAndUpdate: ReturnType<typeof vi.fn> };
  let service: NotificationPreferencesService;

  beforeEach(() => {
    users = { findByIdAndUpdate: vi.fn() };
    service = new NotificationPreferencesService(users as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('registerDevice', () => {
    it('adds the trimmed token to the set of device tokens', async () => {
      users.findByIdAndUpdate.mockResolvedValue({ _id: 'citizen-1' });

      const result = await service.registerDevice('citizen-1', '  device-token  ');

      expect(users.findByIdAndUpdate).toHaveBeenCalledWith(
        'citizen-1',
        { $addToSet: { fcmTokens: 'device-token' } },
        { new: true },
      );
      expect(result).toEqual({
        success: true,
        message: 'Device registered successfully',
      });
    });

    it.each([[''], ['   ']])('rejects the blank token "%s" without touching the database', async (token) => {
      await expect(service.registerDevice('citizen-1', token)).rejects.toThrow(
        new BadRequestException('Device token is required'),
      );

      expect(users.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('reports an unknown user', async () => {
      users.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.registerDevice('missing', 'token')).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });
  });

  describe('unregisterDevice', () => {
    it('pulls the trimmed token from the device tokens', async () => {
      users.findByIdAndUpdate.mockResolvedValue({ _id: 'citizen-1' });

      const result = await service.unregisterDevice('citizen-1', ' token ');

      expect(users.findByIdAndUpdate).toHaveBeenCalledWith(
        'citizen-1',
        { $pull: { fcmTokens: 'token' } },
        { new: true },
      );
      expect(result).toEqual({
        success: true,
        message: 'Device unregistered successfully',
      });
    });

    it('reports an unknown user', async () => {
      users.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.unregisterDevice('missing', 'token')).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });
  });

  describe('updateWhatsappConsent', () => {
    it('records the opt-in together with its timestamp', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-01T10:00:00Z'));
      users.findByIdAndUpdate.mockResolvedValue({ whatsappOptIn: true });

      const result = await service.updateWhatsappConsent('citizen-1', true);

      expect(users.findByIdAndUpdate).toHaveBeenCalledWith(
        'citizen-1',
        {
          $set: {
            whatsappOptIn: true,
            whatsappOptInAt: new Date('2026-05-01T10:00:00Z'),
          },
        },
        { new: true },
      );
      expect(result).toEqual({ success: true, whatsappOptIn: true });
    });

    it('clears the consent timestamp on opt-out', async () => {
      users.findByIdAndUpdate.mockResolvedValue({ whatsappOptIn: false });

      const result = await service.updateWhatsappConsent('citizen-1', false);

      expect(users.findByIdAndUpdate).toHaveBeenCalledWith(
        'citizen-1',
        { $set: { whatsappOptIn: false, whatsappOptInAt: undefined } },
        { new: true },
      );
      expect(result).toEqual({ success: true, whatsappOptIn: false });
    });

    it('reports an unknown user', async () => {
      users.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.updateWhatsappConsent('missing', true)).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });
  });
});
