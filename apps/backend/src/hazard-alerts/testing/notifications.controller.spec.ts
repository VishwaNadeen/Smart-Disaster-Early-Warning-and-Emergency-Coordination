import { describe, expect, it, vi } from 'vitest';

import { NotificationsController } from '../notifications.controller';

describe('NotificationsController', () => {
  const preferences = {
    registerDevice: vi.fn().mockResolvedValue({ success: true }),
    unregisterDevice: vi.fn().mockResolvedValue({ success: true }),
    updateWhatsappConsent: vi.fn().mockResolvedValue({ success: true }),
  };

  const controller = new NotificationsController(preferences as never);
  const request = { user: { id: 'citizen-1' } };

  it('registers a device token for the authenticated user', async () => {
    await controller.registerDevice(request, { token: 'device-token' });

    expect(preferences.registerDevice).toHaveBeenCalledWith('citizen-1', 'device-token');
  });

  it('unregisters a device token for the authenticated user', async () => {
    await controller.unregisterDevice(request, { token: 'device-token' });

    expect(preferences.unregisterDevice).toHaveBeenCalledWith('citizen-1', 'device-token');
  });

  it('updates the WhatsApp consent of the authenticated user', async () => {
    await controller.updateWhatsappConsent(request, { optIn: false });

    expect(preferences.updateWhatsappConsent).toHaveBeenCalledWith('citizen-1', false);
  });
});
