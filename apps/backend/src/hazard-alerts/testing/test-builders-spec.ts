import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';

import { CreateHazardAlertDto } from '../dto/create-hazard-alert.dto';

import {
  AlertRecipient,
  DeliveryRecord,
  NotificationChannelSender,
} from '../channels/notification-channel.sender';

import {
  AlertSeverity,
  HazardAlertDocument,
} from '../schemas/hazard-alert.schema';

import {
  DeliveryStatus,
  NotificationChannel,
} from '../schemas/notification-delivery.schema';

/** Builds an alert document stub; any field can be overridden. */
export function buildAlert(
  overrides: Record<string, unknown> = {},
): HazardAlertDocument {
  return {
    _id: 'alert-1',
    title: 'Flood warning',
    message: 'Heavy rainfall is expected',
    safetyInstructions: 'Move to higher ground',
    hazardType: 'FLOOD',
    severity: AlertSeverity.WARNING,
    affectedDistricts: ['Colombo'],
    affectedCities: ['Kelaniya'],
    notificationChannels: Object.values(NotificationChannel),
    ...overrides,
  } as unknown as HazardAlertDocument;
}

/** Builds a valid publish request; any field can be overridden. */
export function buildCreateDto(
  overrides: Partial<CreateHazardAlertDto> = {},
): CreateHazardAlertDto {
  return {
    title: 'Flood warning',
    message: 'Heavy rainfall is expected',
    safetyInstructions: 'Move to higher ground',
    hazardType: 'FLOOD',
    severity: AlertSeverity.WARNING,
    affectedDistricts: ['Colombo'],
    affectedCities: ['Kelaniya'],
    ...overrides,
  };
}

/** Builds a citizen recipient; by default has no way to be reached. */
export function buildRecipient(
  overrides: Partial<AlertRecipient> = {},
): AlertRecipient {
  return {
    _id: 'citizen-1',
    ...overrides,
  };
}

/** A delivery record whose `save` is a spy. */
export type TestDelivery = DeliveryRecord & {
  save: ReturnType<typeof vi.fn>;
};

/** Builds a PENDING delivery record with a resolving `save` spy. */
export function buildDelivery(
  overrides: Partial<Omit<DeliveryRecord, 'save'>> = {},
): TestDelivery {
  return {
    status: DeliveryStatus.PENDING,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Builds a chainable Mongoose query stub. Every chain method returns the
 * same object and `exec` resolves with the given result.
 */
export function buildQuery<T>(result: T) {
  const query = {
    select: vi.fn(),
    sort: vi.fn(),
    lean: vi.fn(),
    exec: vi.fn().mockResolvedValue(result),
  };

  query.select.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  query.lean.mockReturnValue(query);

  return query;
}

/** A ConfigService stub backed by a plain key/value map. */
export function buildConfig(
  values: Record<string, string> = {},
): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

/**
 * Configurable fake channel sender. By default it can reach everyone and
 * marks the delivery SENT.
 */
export class FakeSender implements NotificationChannelSender {
  readonly send = vi.fn(
    async (
      _alert: HazardAlertDocument,
      _recipient: AlertRecipient,
      delivery: DeliveryRecord,
    ): Promise<void> => {
      delivery.status = DeliveryStatus.SENT;
    },
  );

  constructor(
    readonly channel: NotificationChannel,
    private readonly reachable: (recipient: AlertRecipient) => boolean = () =>
      true,
  ) {}

  canReach(recipient: AlertRecipient): boolean {
    return this.reachable(recipient);
  }
}
