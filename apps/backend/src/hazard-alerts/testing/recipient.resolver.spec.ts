import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../users/schemas/user.schema';

import { RecipientResolver } from '../recipient.resolver';

import { buildAlert, buildQuery } from './test-builders-spec';

const emptyFieldExpression = (field: string) => ({
  $toLower: { $trim: { input: { $ifNull: [field, ''] } } },
});

describe('RecipientResolver', () => {
  let users: { find: ReturnType<typeof vi.fn> };
  let query: ReturnType<typeof buildQuery>;
  let resolver: RecipientResolver;

  const lastFilter = () => users.find.mock.calls[0][0];

  beforeEach(() => {
    query = buildQuery([]);
    users = { find: vi.fn().mockReturnValue(query) };
    resolver = new RecipientResolver(users as never);
  });

  it('returns the matching citizens with only their contact fields selected', async () => {
    const citizens = [
      { _id: 'citizen-1', phone: '0771234567', fcmTokens: ['t'], whatsappOptIn: true },
    ];
    query.exec.mockResolvedValue(citizens);

    const result = await resolver.findCitizensForAlert(buildAlert());

    expect(result).toBe(citizens);
    expect(query.select).toHaveBeenCalledWith('_id phone fcmTokens whatsappOptIn');
    expect(query.lean).toHaveBeenCalledOnce();
  });

  it('only matches active, non-deleted citizens', async () => {
    await resolver.findCitizensForAlert(buildAlert());

    expect(lastFilter()).toMatchObject({
      role: UserRole.CITIZEN,
      isActive: true,
      deletedAt: { $exists: false },
    });
  });

  it('targets the whole district when "All Cities" is selected', async () => {
    await resolver.findCitizensForAlert(
      buildAlert({
        affectedDistricts: ['Colombo', 'Kandy'],
        affectedCities: [' all CITIES '],
      }),
    );

    expect(lastFilter().$expr.$and).toEqual([
      { $in: [emptyFieldExpression('$district'), ['colombo', 'kandy']] },
    ]);
  });

  it('targets named cities and citizens with no recorded city', async () => {
    await resolver.findCitizensForAlert(
      buildAlert({
        affectedDistricts: ['Kandy'],
        affectedCities: ['Peradeniya', 'Katugastota'],
      }),
    );

    const city = emptyFieldExpression('$livingCity');
    expect(lastFilter().$expr.$and).toEqual([
      { $in: [emptyFieldExpression('$district'), ['kandy']] },
      {
        $or: [
          { $eq: [city, ''] },
          { $in: [city, ['peradeniya', 'katugastota']] },
        ],
      },
    ]);
  });

  it('propagates database errors', async () => {
    query.exec.mockRejectedValue(new Error('Recipient registry unavailable'));

    await expect(resolver.findCitizensForAlert(buildAlert())).rejects.toThrow(
      'Recipient registry unavailable',
    );
  });
});
