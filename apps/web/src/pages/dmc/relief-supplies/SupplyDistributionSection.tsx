import type { FormEvent } from 'react';
import { ClipboardList, Truck } from 'lucide-react';

// REVIEW [DRY]: types, humanize(), StatusBadge and Field are redefined here - import them from ./types and ./api.
type SupplyStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INACTIVE';
type DistributionStatus =
  | 'ALLOCATED'
  | 'DISPATCHED'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'CANCELLED';

interface Supply {
  _id: string;
  name: string;
  availableQuantity: number;
  status: SupplyStatus;
}

interface Shelter {
  _id?: string;
  id?: string;
  name: string;
  district: string;
}

interface Distribution {
  _id: string;
  supplyId: Supply | string;
  shelterId: Shelter | string;
  shelterName: string;
  allocatedQuantity: number;
  dispatchedQuantity: number;
  deliveredQuantity: number;
  status: DistributionStatus;
  notes?: string;
}

interface Props {
  supplies: Supply[];
  shelters: Shelter[];
  openShelters: Shelter[];
  distributions: Distribution[];
  loading: boolean;
  saving: boolean;
  selectedSupplyId: string;
  selectedShelterId: string;
  allocatedQuantity: string;
  notes: string;
  inputClass: string;
  onSupplyChange: (value: string) => void;
  onShelterChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onAllocate: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateDistribution: (
    distribution: Distribution,
    status: DistributionStatus
  ) => void;
  // REVIEW [Smell]: a pure utility passed as a prop - import getId from ./api instead.
  getId: (value: string | { _id?: string; id?: string }) => string;
}

function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'AVAILABLE' || status === 'DELIVERED'
      ? 'bg-emerald-50 text-emerald-700'
      : ['LOW_STOCK', 'ALLOCATED', 'DISPATCHED', 'PARTIALLY_DELIVERED'].includes(status)
        ? 'bg-amber-50 text-amber-700'
        : ['OUT_OF_STOCK', 'INACTIVE', 'CANCELLED'].includes(status)
          ? 'bg-red-50 text-red-700'
          : 'bg-blue-50 text-blue-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      {humanize(status)}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export default function SupplyDistributionSection({
  supplies,
  shelters,
  openShelters,
  distributions,
  loading,
  saving,
  selectedSupplyId,
  selectedShelterId,
  allocatedQuantity,
  notes,
  inputClass,
  onSupplyChange,
  onShelterChange,
  onQuantityChange,
  onNotesChange,
  onAllocate,
  onUpdateDistribution,
  getId,
}: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
            <Truck size={21} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">
              Allocate supplies to a shelter
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Allocated quantities are reserved until dispatch.
            </p>
          </div>
        </div>

        <form
          onSubmit={onAllocate}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="Supply item">
            <select
              required
              value={selectedSupplyId}
              onChange={(event) => onSupplyChange(event.target.value)}
              className={inputClass}
            >
              <option value="">Select supply</option>
              {supplies
                .filter((supply) => supply.status !== 'INACTIVE')
                .map((supply) => (
                  <option key={supply._id} value={supply._id}>
                    {supply.name} — {supply.availableQuantity} available
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Shelter">
            <select
              required
              value={selectedShelterId}
              onChange={(event) => onShelterChange(event.target.value)}
              className={inputClass}
            >
              <option value="">Select open shelter</option>
              {openShelters.map((shelter) => {
                const id = getId(shelter._id ?? shelter.id ?? '');
                return (
                  <option key={id} value={id}>
                    {shelter.name} — {shelter.district}
                  </option>
                );
              })}
            </select>
          </Field>

          <Field label="Quantity to allocate">
            <input
              required
              type="number"
              min="1"
              step="1"
              value={allocatedQuantity}
              onChange={(event) => onQuantityChange(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Notes (optional)">
            <input
              maxLength={500}
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              className={inputClass}
              placeholder="Allocation notes"
            />
          </Field>

          <div className="md:col-span-2 xl:col-span-4">
            <button
              disabled={saving || !selectedSupplyId || !selectedShelterId}
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <ClipboardList size={17} />
              {saving ? 'Allocating...' : 'Allocate supplies'}
            </button>
          </div>
        </form>

        {openShelters.length === 0 && (
          <p className="mt-3 text-sm text-amber-700">
            No active open shelters are available from the shelter API.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Distribution tracking</h3>
        <p className="mt-1 text-sm text-slate-500">
          Follow allocations from dispatch to delivery.
        </p>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            Loading relief supply data...
          </div>
        ) : distributions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
            <p className="text-sm text-slate-500">
              No distributions have been created yet.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Supply / shelter</th>
                  <th className="px-4 py-3">Allocated</th>
                  <th className="px-4 py-3">Dispatched</th>
                  <th className="px-4 py-3">Delivered</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {distributions.map((item) => {
                  const supplyName =
                    typeof item.supplyId === 'object'
                      ? item.supplyId.name
                      : supplies.find((supply) => supply._id === item.supplyId)
                          ?.name ?? 'Supply item';

                  const shelterName =
                    item.shelterName ||
                    (typeof item.shelterId === 'object'
                      ? item.shelterId.name
                      : shelters.find(
                          (shelter) =>
                            getId(shelter._id ?? shelter.id ?? '') ===
                            item.shelterId
                        )?.name) ||
                    'Shelter';

                  const terminal = ['DELIVERED', 'CANCELLED'].includes(
                    item.status
                  );

                  return (
                    <tr key={item._id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {supplyName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {shelterName}
                        </p>
                        {item.notes && (
                          <p className="mt-1 text-xs text-slate-400">
                            {item.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">{item.allocatedQuantity}</td>
                      <td className="px-4 py-4">{item.dispatchedQuantity}</td>
                      <td className="px-4 py-4">{item.deliveredQuantity}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {item.status === 'ALLOCATED' && (
                            <>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  onUpdateDistribution(item, 'DISPATCHED')
                                }
                                className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                Mark dispatched
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  onUpdateDistribution(item, 'CANCELLED')
                                }
                                className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {(item.status === 'DISPATCHED' ||
                            item.status === 'PARTIALLY_DELIVERED') && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                onUpdateDistribution(item, 'DELIVERED')
                              }
                              className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Confirm full delivery
                            </button>
                          )}

                          {terminal && (
                            <span className="text-xs text-slate-400">
                              No further actions
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}