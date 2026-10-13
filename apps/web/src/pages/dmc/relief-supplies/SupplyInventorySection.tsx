
import type { FormEvent } from 'react';
import { Boxes, PackagePlus } from 'lucide-react';

// REVIEW [DRY]: types, humanize() and StatusBadge are redefined here - import them from ./types and ./api.
type Category =
  | 'FOOD'
  | 'WATER'
  | 'MEDICAL'
  | 'CLOTHING'
  | 'HYGIENE'
  | 'SHELTER_EQUIPMENT'
  | 'OTHER';

type Unit =
  | 'PIECES'
  | 'PACKETS'
  | 'BOXES'
  | 'KILOGRAMS'
  | 'LITRES'
  | 'BOTTLES'
  | 'SETS';

interface Supply {
  _id: string;
  name: string;
  supplyCode: string;
  category: Category;
  unit: Unit;
  availableQuantity: number;
  reservedQuantity: number;
  status: string;
  storageLocation?: string;
}

interface Props {
  // REVIEW [ISP]: `supplies` is never used by this component, and 24 props is a fat interface.
  supplies: Supply[];
  filteredSupplies: Supply[];
  loading: boolean;
  saving: boolean;
  search: string;
  name: string;
  supplyCode: string;
  category: Category;
  unit: Unit;
  quantity: string;
  minimumStock: string;
  storageLocation: string;
  description: string;
  inputClass: string;
  onSearchChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSupplyCodeChange: (value: string) => void;
  onCategoryChange: (value: Category) => void;
  onUnitChange: (value: Unit) => void;
  onQuantityChange: (value: string) => void;
  onMinimumStockChange: (value: string) => void;
  onStorageLocationChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onRegister: (event: FormEvent<HTMLFormElement>) => void;
}

const categories: Category[] = [
  'FOOD',
  'WATER',
  'MEDICAL',
  'CLOTHING',
  'HYGIENE',
  'SHELTER_EQUIPMENT',
  'OTHER',
];

const units: Unit[] = [
  'PIECES',
  'PACKETS',
  'BOXES',
  'KILOGRAMS',
  'LITRES',
  'BOTTLES',
  'SETS',
];

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
      : status === 'LOW_STOCK' ||
          status === 'ALLOCATED' ||
          status === 'DISPATCHED'
        ? 'bg-amber-50 text-amber-700'
        : status === 'OUT_OF_STOCK' ||
            status === 'INACTIVE' ||
            status === 'CANCELLED'
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

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <span className="animate-spin">⟳</span>
      Loading relief supply data...
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
      <Boxes size={32} className="mx-auto text-slate-400" />
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function SupplyInventorySection({
  filteredSupplies,
  loading,
  saving,
  search,
  name,
  supplyCode,
  category,
  unit,
  quantity,
  minimumStock,
  storageLocation,
  description,
  inputClass,
  onSearchChange,
  onNameChange,
  onSupplyCodeChange,
  onCategoryChange,
  onUnitChange,
  onQuantityChange,
  onMinimumStockChange,
  onStorageLocationChange,
  onDescriptionChange,
  onRegister,
}: Props) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      {/* Inventory list */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Inventory list</h3>
            <p className="mt-1 text-sm text-slate-500">
              Current central relief supply stock.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search supplies..."
            className={`${inputClass} sm:w-64`}
          />
        </div>

        {loading ? (
          <Loading />
        ) : filteredSupplies.length === 0 ? (
          <EmptyState message="No supply items found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Supply</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">Reserved</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredSupplies.map((supply) => (
                  <tr key={supply._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">
                        {supply.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {supply.supplyCode} · {humanize(supply.category)}
                      </p>
                      {supply.storageLocation && (
                        <p className="mt-1 text-xs text-slate-400">
                          {supply.storageLocation}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {supply.availableQuantity}{' '}
                      {humanize(supply.unit).toLowerCase()}
                    </td>
                    <td className="px-4 py-4">{supply.reservedQuantity}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={supply.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Register supply form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
            <PackagePlus size={21} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Register supply</h3>
            <p className="mt-1 text-sm text-slate-500">
              Add a new inventory item.
            </p>
          </div>
        </div>

        <form onSubmit={onRegister} className="space-y-4">
          <Field label="Supply name">
            <input
              required
              maxLength={100}
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className={inputClass}
              placeholder="e.g. Drinking water"
            />
          </Field>

          <Field label="Supply code">
            <input
              required
              maxLength={30}
              value={supplyCode}
              onChange={(event) =>
                onSupplyCodeChange(event.target.value.toUpperCase())
              }
              className={inputClass}
              placeholder="e.g. WAT-001"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                value={category}
                onChange={(event) =>
                  onCategoryChange(event.target.value as Category)
                }
                className={inputClass}
              >
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Unit">
              <select
                value={unit}
                onChange={(event) =>
                  onUnitChange(event.target.value as Unit)
                }
                className={inputClass}
              >
                {units.map((value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Initial quantity">
              <input
                required
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Minimum stock">
              <input
                required
                type="number"
                min="0"
                step="1"
                value={minimumStock}
                onChange={(event) =>
                  onMinimumStockChange(event.target.value)
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Storage location (optional)">
            <input
              value={storageLocation}
              onChange={(event) =>
                onStorageLocationChange(event.target.value)
              }
              className={inputClass}
              placeholder="Central store"
            />
          </Field>

          <Field label="Description (optional)">
            <textarea
              rows={2}
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className={inputClass}
            />
          </Field>

          <button
            disabled={saving}
            type="submit"
            className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Register supply item'}
          </button>
        </form>
      </section>
    </div>
  );
}
