import { describe, expect, it, vi } from 'vitest';

import { ROLES_KEY } from '../../common/roles.decorator';

import { UserRole } from '../../users/schemas/user.schema';

import { HazardAlertsController } from '../hazard-alerts.controller';

const OFFICER_ROLES = [
  UserRole.DUTY_OFFICER,
  UserRole.DISTRICT_OFFICER,
  UserRole.ADMIN,
  UserRole.SYSTEM_ADMIN,
];

describe('HazardAlertsController', () => {
  const service = {
    publish: vi.fn().mockResolvedValue({ success: true }),
    listPublished: vi.fn().mockResolvedValue({ data: ['published'] }),
    listAll: vi.fn().mockResolvedValue({ data: ['all'] }),
    listDeliveries: vi.fn().mockResolvedValue({ data: 'deliveries' }),
    cancelAlert: vi.fn().mockResolvedValue({ message: 'Alert cancelled' }),
    getPublishedById: vi.fn().mockResolvedValue({ data: 'alert' }),
  };

  const controller = new HazardAlertsController(service as never);

  const rolesOf = (handler: keyof HazardAlertsController) =>
    Reflect.getMetadata(ROLES_KEY, HazardAlertsController.prototype[handler]);

  it('publishes an alert on behalf of the authenticated officer', async () => {
    const dto = { title: 'Flood warning' } as never;

    await controller.publish({ user: { id: 'officer-1' } }, dto);

    expect(service.publish).toHaveBeenCalledWith('officer-1', dto);
  });

  it('lists published alerts for any signed-in user', async () => {
    await expect(controller.listPublished()).resolves.toEqual({ data: ['published'] });
  });

  it('lists the full alert history', async () => {
    await expect(controller.listAll()).resolves.toEqual({ data: ['all'] });
  });

  it('lists the deliveries of an alert', async () => {
    await controller.listDeliveries('alert-1');

    expect(service.listDeliveries).toHaveBeenCalledWith('alert-1');
  });

  it('cancels an alert with the given reason', async () => {
    await controller.cancel('alert-1', { reason: 'Threat has passed' });

    expect(service.cancelAlert).toHaveBeenCalledWith('alert-1', 'Threat has passed');
  });

  it('returns a published alert by ID', async () => {
    await controller.getPublishedById('alert-1');

    expect(service.getPublishedById).toHaveBeenCalledWith('alert-1');
  });

  it.each(['publish', 'listAll', 'listDeliveries', 'cancel'] as const)(
    'restricts %s to officer and admin roles',
    (handler) => {
      expect(rolesOf(handler)).toEqual(OFFICER_ROLES);
    },
  );

  it.each(['listPublished', 'getPublishedById'] as const)(
    'leaves %s open to every authenticated user',
    (handler) => {
      expect(rolesOf(handler)).toBeUndefined();
    },
  );
});
