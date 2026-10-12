

import { useCallback, useEffect, useState, type FormEvent } from 'react'

import {

  AlertCircle,

  Boxes,

  Check,

  ClipboardList,

  PackagePlus,

  RefreshCw,

  Search,

  Truck,

  X,

} from 'lucide-react'



const API_URL = 'http\://localhost:3000/api'



type Category =

  | 'FOOD'

  | 'WATER'

  | 'MEDICAL'

  | 'CLOTHING'

  | 'HYGIENE'

  | 'SHELTER_EQUIPMENT'

  | 'OTHER'



type Unit =

  | 'PIECES'

  | 'PACKETS'

  | 'BOXES'

  | 'KILOGRAMS'

  | 'LITRES'

  | 'BOTTLES'

  | 'SETS'



type SupplyStatus =

  | 'AVAILABLE'

  | 'LOW_STOCK'

  | 'OUT_OF_STOCK'

  | 'INACTIVE'



type RequestStatus =

  | 'PENDING'

  | 'APPROVED'

  | 'REJECTED'

  | 'PARTIALLY_ALLOCATED'

  | 'ALLOCATED'

  | 'CANCELLED'



type DistributionStatus =

  | 'ALLOCATED'

  | 'DISPATCHED'

  | 'PARTIALLY_DELIVERED'

  | 'DELIVERED'

  | 'CANCELLED'



interface Supply {

  _id: string

  name: string

  supplyCode: string

  category: Category

  unit: Unit

  totalQuantity: number

  availableQuantity: number

  reservedQuantity: number

  minimumStockLevel: number

  storageLocation?: string

  description?: string

  status: SupplyStatus

}



interface Shelter {

  _id?: string

  id?: string

  name: string

  district: string

  isActive?: boolean

  operationalStatus?: string

}



interface SupplyRequest {

  _id: string

  shelterId: Shelter | string

  requestedBy?: { fullName?: string; email?: string } | string

  category: Category

  itemName: string

  unit: Unit

  requestedQuantity: number

  reason: string

  status: RequestStatus

  decisionNotes?: string

  createdAt?: string

}



interface Distribution {

  _id: string

  supplyId: Supply | string

  shelterId: Shelter | string

  shelterName: string

  allocatedQuantity: number

  dispatchedQuantity: number

  deliveredQuantity: number

  status: DistributionStatus

  notes?: string

}



interface Props {

  token: string

  role: string

  district?: string

}



const categories: Category[] = [

  'FOOD',

  'WATER',

  'MEDICAL',

  'CLOTHING',

  'HYGIENE',

  'SHELTER_EQUIPMENT',

  'OTHER',

]



const units: Unit[] = [

  'PIECES',

  'PACKETS',

  'BOXES',

  'KILOGRAMS',

  'LITRES',

  'BOTTLES',

  'SETS',

]



const inputClass =

  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100'



async function apiRequest<T>(

  path: string,

  token: string,

  options?: RequestInit,

): Promise<T> {

  const response = await fetch(`${API_URL}${path}`, {

    ...options,

    headers: {

      Accept: 'application/json',

      Authorization: `Bearer ${token}`,

      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),

      ...options?.headers,

    },

  })



  const result = await response.json().catch(() => null)



  if (!response.ok) {

    const message = Array.isArray(result?.message)

      ? result.message.join(', ')

      : result?.message || `Request failed (${response.status}).`



    throw new Error(message)

  }



  return result as T

}



function asArray<T>(result: unknown): T[] {

  if (Array.isArray(result)) return result as T[]



  if (result && typeof result === 'object') {

    const data = result as Record<string, unknown>



    for (const key of [

      'data',

      'items',

      'supplies',

      'shelters',

      'distributions',

    ]) {

      const value = data[key]



      if (Array.isArray(value)) return value as T[]



      if (value && typeof value === 'object') {

        const nested = value as Record<string, unknown>



        for (const nestedKey of ['items', 'shelters', 'data']) {

          if (Array.isArray(nested[nestedKey])) {

            return nested[nestedKey] as T[]

          }

        }

      }

    }

  }



  return []

}



function getId(value: string | { _id?: string; id?: string }) {

  return typeof value === 'string' ? value : value._id ?? value.id ?? ''

}



function humanize(value: string) {

  return value

    .replaceAll('_', ' ')

    .toLowerCase()

    .replace(/\b\w/g, (character) => character.toUpperCase())

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

          : 'bg-blue-50 text-blue-700'



  return (

    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>

      {humanize(status)}

    </span>

  )

}



export default function ReliefSuppliesPage({

  token,

  role,

  district,

}: Props) {

  const [supplies, setSupplies] = useState<Supply[]>([])

  const [shelters, setShelters] = useState<Shelter[]>([])

  const [distributions, setDistributions] = useState<Distribution[]>([])

  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([])

  const [requestsLoading, setRequestsLoading] = useState(false)

  const [requestsError, setRequestsError] = useState('')
  const [pendingReview, setPendingReview] = useState<{ request: SupplyRequest; decision: 'APPROVED' | 'REJECTED' } | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')



  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')

  const [notice, setNotice] = useState('')

  const [search, setSearch] = useState('')

  const [tab, setTab] = useState<'inventory' | 'distributions' | 'requests'>('inventory')



  const [name, setName] = useState('')

  const [supplyCode, setSupplyCode] = useState('')

  const [category, setCategory] = useState<Category>('WATER')

  const [unit, setUnit] = useState<Unit>('BOTTLES')

  const [quantity, setQuantity] = useState('100')

  const [minimumStock, setMinimumStock] = useState('10')

  const [storageLocation, setStorageLocation] = useState('')

  const [description, setDescription] = useState('')



  const [selectedSupplyId, setSelectedSupplyId] = useState('')

  const [selectedShelterId, setSelectedShelterId] = useState('')

  const [allocatedQuantity, setAllocatedQuantity] = useState('10')

  const [notes, setNotes] = useState('')



  const loadData = useCallback(async () => {

    setLoading(true)

    setError('')



    try {

      const [supplyResult, shelterResult, distributionResult] =

        await Promise.all([

          apiRequest<unknown>('/relief-supplies', token),

          apiRequest<unknown>('/shelters', token),

          apiRequest<unknown>('/relief-supplies/distributions', token),

        ])



      setSupplies(asArray<Supply>(supplyResult))

      setShelters(asArray<Shelter>(shelterResult))

      setDistributions(asArray<Distribution>(distributionResult))

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : 'Unable to load relief supply information.',

      )

    } finally {

      setLoading(false)

    }

  }, [token])



  useEffect(() => {

    void loadData()

  }, [loadData])



  // Load pending requests independently so a request API error does not

  // prevent the existing inventory and distribution screens from loading.

  const loadSupplyRequests = useCallback(async () => {

    setRequestsLoading(true)

    setRequestsError('')



    try {

      const result = await apiRequest<unknown>(

        '/relief-supply-requests',

        token,

      )

      setSupplyRequests(asArray<SupplyRequest>(result))

    } catch (err) {

      setRequestsError(

        err instanceof Error

          ? err.message

          : 'Unable to load shelter supply requests.',

      )

    } finally {

      setRequestsLoading(false)

    }

  }, [token])



  function openReviewDialog(request: SupplyRequest, decision: 'APPROVED' | 'REJECTED') {
    setPendingReview({ request, decision })
    setReviewNotes('')
    setError('')
    setNotice('')
  }

  async function confirmReviewSupplyRequest() {
    if (!pendingReview) return
    const { request, decision } = pendingReview
    setSaving(true)
    setError('')
    setNotice('')
    setRequestsError('')
    try {
      await apiRequest(`/relief-supply-requests/${request._id}/decision`, token, 
     {
          method: 'PATCH',
        body: JSON.stringify({ decision, decisionNotes: reviewNotes.trim() }),
      })
      setPendingReview(null)
      setReviewNotes('')
      setNotice(decision === 'APPROVED' ? 'Request approved and supplies allocated successfully.' : 'Supply request rejected successfully.')
      await Promise.all([loadSupplyRequests(), loadData()])
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to ${decision === 'APPROVED' ? 'approve' : 'reject'} the request.`)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {

    void loadSupplyRequests()

  }, [loadSupplyRequests])



  useEffect(() => {

    if (!selectedSupplyId && supplies.length > 0) {

      setSelectedSupplyId(supplies[0]._id)

    }

  }, [selectedSupplyId, supplies])



  const filteredSupplies = supplies.filter((supply) => {

    const term = search.trim().toLowerCase()



    return (

      !term ||

      [supply.name, supply.supplyCode, supply.category, supply.storageLocation]

        .filter(Boolean)

        .some((value) => String(value).toLowerCase().includes(term))

    )

  })



  const openShelters = shelters.filter(

    (shelter) =>

      shelter.isActive !== false &&

      (!shelter.operationalStatus ||

        shelter.operationalStatus === 'OPEN') &&

      (!role.includes('DISTRICT_OFFICER') ||

        !district ||

        shelter.district?.toLowerCase() === district.toLowerCase()),

  )



  async function registerSupply(event: FormEvent<HTMLFormElement>) {

    event.preventDefault()

    setSaving(true)

    setError('')

    setNotice('')



    try {

      await apiRequest('/relief-supplies', token, {

        method: 'POST',

        body: JSON.stringify({

          name: name.trim(),

          supplyCode: supplyCode.trim().toUpperCase(),

          category,

          unit,

          totalQuantity: Number(quantity),

          minimumStockLevel: Number(minimumStock),

          storageLocation: storageLocation.trim(),

          description: description.trim(),

        }),

      })



      setName('')

      setSupplyCode('')

      setQuantity('100')

      setMinimumStock('10')

      setStorageLocation('')

      setDescription('')

      setNotice('Supply item registered successfully.')



      await loadData()

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Unable to register supply.')

    } finally {

      setSaving(false)

    }

  }



  async function allocateSupply(event: FormEvent<HTMLFormElement>) {

    event.preventDefault()

    setSaving(true)

    setError('')

    setNotice('')



    try {

      await apiRequest('/relief-supplies/distributions', token, {

        method: 'POST',

        body: JSON.stringify({

          supplyId: selectedSupplyId,

          shelterId: selectedShelterId,

          allocatedQuantity: Number(allocatedQuantity),

          notes: notes.trim(),

        }),

      })



      setNotes('')

      setNotice('Supplies allocated to the shelter successfully.')

      setTab('distributions')

      await loadData()

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Unable to allocate supplies.')

    } finally {

      setSaving(false)

    }

  }



  async function updateDistribution(

    distribution: Distribution,

    status: DistributionStatus,

  ) {

    setSaving(true)

    setError('')

    setNotice('')



    const body: {

      status: DistributionStatus

      dispatchedQuantity?: number

      deliveredQuantity?: number

      notes?: string

    } = {

      status,

      notes: distribution.notes ?? '',

    }



    if (status === 'DISPATCHED') {

      body.dispatchedQuantity = distribution.allocatedQuantity

    }



    if (status === 'DELIVERED') {

      body.dispatchedQuantity = distribution.allocatedQuantity

      body.deliveredQuantity = distribution.allocatedQuantity

    }



    try {

      await apiRequest(

        `/relief-supplies/distributions/${distribution._id}/status`,

        token,

        {

          method: 'PATCH',

          body: JSON.stringify(body),

        },

      )



      setNotice(`Distribution updated to ${humanize(status)}.`)

      await loadData()

    } catch (err) {

      setError(

        err instanceof Error ? err.message : 'Unable to update distribution.',

      )

    } finally {

      setSaving(false)

    }

  }



  const availableTotal = supplies.reduce(

    (sum, supply) => sum + (Number(supply.availableQuantity) || 0),

    0,

  )



  const lowStockCount = supplies.filter(

    (supply) =>

      supply.status === 'LOW_STOCK' || supply.status === 'OUT_OF_STOCK',

  ).length



  const pendingCount = distributions.filter(

    (item) => !['DELIVERED', 'CANCELLED'].includes(item.status),

  ).length



  return (

    <div className="space-y-6">

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

        <div>

          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">

            DMC Operations

          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">

            Relief Supplies

          </h2>

          <p className="mt-1 text-sm text-slate-500">

            Manage inventory, allocate supplies, and track shelter deliveries.

          </p>

        </div>



        <button

          type="button"

          onClick={() => { void loadData(); void loadSupplyRequests() }}

          disabled={loading}

          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"

        >

          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />

          Refresh

        </button>

      </div>



      {error && (

        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">

          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <span>{error}</span>

        </div>

      )}



      {notice && (

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">

          {notice}

        </div>

      )}



      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <Metric title="Supply items" value={supplies.length} icon={<Boxes />} />

        <Metric

          title="Available units"

          value={availableTotal.toLocaleString()}

          icon={<PackagePlus />}

        />

        <Metric

          title="Low / out of stock"

          value={lowStockCount}

          icon={<AlertCircle />}

        />

        <Metric

          title="Pending distributions"

          value={pendingCount}

          icon={<Truck />}

        />

      </div>



      <div className="flex flex-wrap gap-2 border-b border-slate-200">

        <TabButton

          active={tab === 'inventory'}

          onClick={() => setTab('inventory')}

          icon={<Boxes size={17} />}

        >

          Inventory

        </TabButton>



        <TabButton

          active={tab === 'distributions'}

          onClick={() => setTab('distributions')}

          icon={<ClipboardList size={17} />}

        >

          Shelter distributions

        </TabButton>



        <TabButton

          active={tab === 'requests'}

          onClick={() => { setTab('requests'); void loadSupplyRequests() }}

          icon={<ClipboardList size={17} />}

        >

          Shelter requests ({supplyRequests.filter((request) => request.status === 'PENDING').length})

        </TabButton>

      </div>



      {tab === 'inventory' ? (

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">

            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h3 className="font-bold text-slate-900">Inventory list</h3>

                <p className="mt-1 text-sm text-slate-500">

                  Current central relief supply stock.

                </p>

              </div>



              <div className="relative sm:w-64">

                <Search

                  size={16}

                  className="absolute left-3 top-3 text-slate-400"

                />

                <input

                  value={search}

                  onChange={(event) => setSearch(event.target.value)}

                  placeholder="Search supplies..."

                  className={`${inputClass} pl-9`}

                />

              </div>

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

                          {supply.availableQuantity} {humanize(supply.unit).toLowerCase()}

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



            <form onSubmit={registerSupply} className="space-y-4">

              <Field label="Supply name">

                <input

                  required

                  maxLength={100}

                  value={name}

                  onChange={(event) => setName(event.target.value)}

                  className={inputClass}

                  placeholder="e.g. Drinking water"

                />

              </Field>



              <Field label="Supply code">

                <input

                  required

                  maxLength={30}

                  value={supplyCode}

                  onChange={(event) => setSupplyCode(event.target.value.toUpperCase())}

                  className={inputClass}

                  placeholder="e.g. WAT-001"

                />

              </Field>



              <div className="grid grid-cols-2 gap-3">

                <Field label="Category">

                  <select

                    value={category}

                    onChange={(event) => setCategory(event.target.value as Category)}

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

                    onChange={(event) => setUnit(event.target.value as Unit)}

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

                    onChange={(event) => setQuantity(event.target.value)}

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

                    onChange={(event) => setMinimumStock(event.target.value)}

                    className={inputClass}

                  />

                </Field>

              </div>



              <Field label="Storage location (optional)">

                <input

                  value={storageLocation}

                  onChange={(event) => setStorageLocation(event.target.value)}

                  className={inputClass}

                  placeholder="Central store"

                />

              </Field>



              <Field label="Description (optional)">

                <textarea

                  rows={2}

                  value={description}

                  onChange={(event) => setDescription(event.target.value)}

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

      ) : (

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

              onSubmit={allocateSupply}

              className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"

            >

              <Field label="Supply item">

                <select

                  required

                  value={selectedSupplyId}

                  onChange={(event) => setSelectedSupplyId(event.target.value)}

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

                  onChange={(event) => setSelectedShelterId(event.target.value)}

                  className={inputClass}

                >

                  <option value="">Select open shelter</option>

                  {openShelters.map((shelter) => (

                    <option

                      key={getId(shelter._id ?? shelter.id ?? '')}

                      value={getId(shelter._id ?? shelter.id ?? '')}

                    >

                      {shelter.name} — {shelter.district}

                    </option>

                  ))}

                </select>

              </Field>



              <Field label="Quantity to allocate">

                <input

                  required

                  type="number"

                  min="1"

                  step="1"

                  value={allocatedQuantity}

                  onChange={(event) => setAllocatedQuantity(event.target.value)}

                  className={inputClass}

                />

              </Field>



              <Field label="Notes (optional)">

                <input

                  maxLength={500}

                  value={notes}

                  onChange={(event) => setNotes(event.target.value)}

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



          <section className="rounded-xl border border-slate-200 bg-white p-5">

            <h3 className="font-bold text-slate-900">Distribution tracking</h3>

            <p className="mt-1 text-sm text-slate-500">

              Follow allocations from dispatch to delivery.

            </p>



            {loading ? (

              <Loading />

            ) : distributions.length === 0 ? (

              <EmptyState message="No distributions have been created yet." />

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

                          : supplies.find((supply) => supply._id === item.supplyId)?.name ??

                            'Supply item'



                      const shelterName =

                        item.shelterName ||

                        (typeof item.shelterId === 'object'

                          ? item.shelterId.name

                          : shelters.find(

                              (shelter) =>

                                getId(shelter._id ?? shelter.id ?? '') === item.shelterId,

                            )?.name) ||

                        'Shelter'



                      const terminal = ['DELIVERED', 'CANCELLED'].includes(item.status)



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

                                    onClick={() => void updateDistribution(item, 'DISPATCHED')}

                                    className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"

                                  >

                                    Mark dispatched

                                  </button>

                                  <button

                                    type="button"

                                    disabled={saving}

                                    onClick={() => void updateDistribution(item, 'CANCELLED')}

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

                                  onClick={() => void updateDistribution(item, 'DELIVERED')}

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

                      )

                    })}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        </div>

    )}  



        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">

          <div className="border-b border-slate-200 p-5">

            <h3 className="font-bold text-slate-900">Shelter supply requests</h3>

            <p className="mt-1 text-sm text-slate-500">

              Review requests submitted by staff at assigned shelters.

            </p>

          </div>



          {requestsError && (

            <div role="alert" className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">

              <p className="font-semibold">Unable to load supply requests</p>

              <p className="mt-1">{requestsError}</p>

              <button

                type="button"

                onClick={() => void loadSupplyRequests()}

                className="mt-3 rounded-md border border-red-200 bg-white px-3 py-2 font-semibold hover:bg-red-50"

              >

                Try again

              </button>

            </div>

          )}



          {requestsLoading ? (

            <Loading />

          ) : supplyRequests.length === 0 ? (

            <EmptyState message={requestsError ? 'Requests could not be loaded.' : 'No shelter supply requests found.'} />

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[850px] text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                  <tr>

                    <th className="px-4 py-3">Shelter</th>

                    <th className="px-4 py-3">Requested item</th>

                    <th className="px-4 py-3">Quantity</th>

                    <th className="px-4 py-3">Reason</th>

                    <th className="px-4 py-3">Status</th>

                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Actions</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {supplyRequests.map((request) => {

                    const shelterName = typeof request.shelterId === 'object'

                      ? request.shelterId.name

                      : shelters.find((shelter) => getId(shelter._id ?? shelter.id ?? '') === request.shelterId)?.name ?? 'Shelter'



                    return (

                      <tr key={request._id} className="align-top hover:bg-slate-50">

                        <td className="px-4 py-4 font-semibold text-slate-900">{shelterName}</td>

                        <td className="px-4 py-4">

                          <p className="font-semibold text-slate-900">{request.itemName}</p>

                          <p className="mt-1 text-xs text-slate-500">{humanize(request.category)}</p>

                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">{request.requestedQuantity} {humanize(request.unit)}</td>

                        <td className="max-w-xs whitespace-normal px-4 py-4">{request.reason}</td>

                        <td className="px-4 py-4"><StatusBadge status={request.status} /></td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-500">{request.createdAt ? new Date(request.createdAt).toLocaleString() : '—'}</td>
                        <td className="px-4 py-4">
                          {request.status === 'PENDING' ? (
                            <div className="flex min-w-[230px] flex-wrap gap-2">
                              <button type="button" disabled={saving} onClick={() => openReviewDialog(request, 'APPROVED')} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                                <Check size={14} /> Approve &amp; Allocate
                              </button>
                              <button type="button" disabled={saving} onClick={() => openReviewDialog(request, 'REJECTED')} className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                                <X size={14} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Reviewed</span>
                          )}
                        </td>

                      </tr>

                    )

                  })}

                </tbody>

              </table>

            </div>

          )}

        </section>

      {pendingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) { setPendingReview(null); setReviewNotes('') } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${pendingReview.decision === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{pendingReview.decision === 'APPROVED' ? <Check size={22} /> : <X size={22} />}</div>
              <div className="min-w-0 flex-1">
                <h3 id="review-dialog-title" className="text-lg font-bold text-slate-900">{pendingReview.decision === 'APPROVED' ? 'Approve & Allocate Supplies' : 'Reject Supply Request'}</h3>
                <p className="mt-1 text-sm text-slate-500">{pendingReview.decision === 'APPROVED' ? 'Review the request details before confirming. Available inventory will be used for the allocation.' : 'Please confirm that you want to reject this shelter supply request.'}</p>
              </div>
              <button type="button" aria-label="Close confirmation" disabled={saving} onClick={() => { setPendingReview(null); setReviewNotes('') }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X size={18} /></button>
            </div>
            <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4 text-sm"><span className="text-slate-500">Shelter</span><span className="text-right font-semibold text-slate-900">{typeof pendingReview.request.shelterId === 'object' ? pendingReview.request.shelterId.name : shelters.find((shelter) => getId(shelter._id ?? shelter.id ?? '') === pendingReview.request.shelterId)?.name ?? 'Shelter'}</span></div>
              <div className="flex items-start justify-between gap-4 text-sm"><span className="text-slate-500">Requested item</span><span className="text-right font-semibold text-slate-900">{pendingReview.request.itemName}</span></div>
              <div className="flex items-start justify-between gap-4 text-sm"><span className="text-slate-500">Category</span><span className="text-right text-slate-700">{humanize(pendingReview.request.category)}</span></div>
              <div className="flex items-start justify-between gap-4 text-sm"><span className="text-slate-500">Requested quantity</span><span className="text-right font-semibold text-slate-900">{pendingReview.request.requestedQuantity} {humanize(pendingReview.request.unit)}</span></div>
              <div className="border-t border-slate-200 pt-3 text-sm"><p className="text-slate-500">Reason</p><p className="mt-1 whitespace-pre-wrap text-slate-800">{pendingReview.request.reason || 'No reason provided.'}</p></div>
            </div>
            <label className="mt-4 block"><span className="text-sm font-medium text-slate-700">{pendingReview.decision === 'APPROVED' ? 'Decision notes (optional)' : 'Rejection reason (optional)'}</span><textarea rows={3} maxLength={500} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder={pendingReview.decision === 'APPROVED' ? 'Add allocation notes if needed...' : 'Explain why this request is being rejected...'} className={`${inputClass} mt-1.5 resize-y`} /></label>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={saving} onClick={() => { setPendingReview(null); setReviewNotes('') }} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void confirmReviewSupplyRequest()} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${pendingReview.decision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>{saving ? <RefreshCw size={16} className="animate-spin" /> : pendingReview.decision === 'APPROVED' ? <Check size={16} /> : <X size={16} />}{saving ? 'Processing...' : pendingReview.decision === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}</button>
            </div>
          </section>
        </div>
      )}




    </div>

  )

}



function Field({

  label,

  children,

}: {

  label: string

  children: React.ReactNode

}) {

  return (

    <label className="block space-y-1.5">

      <span className="text-sm font-medium text-slate-700">{label}</span>

      {children}

    </label>

  )

}



function Metric({

  title,

  value,

  icon,

}: {

  title: string

  value: string | number

  icon: React.ReactNode

}) {

  return (

    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>

        </div>

        <div className="rounded-lg bg-teal-50 p-3 text-teal-700">{icon}</div>

      </div>

    </article>

  )

}



function TabButton({

  active,

  onClick,

  icon,

  children,

}: {

  active: boolean

  onClick: () => void

  icon: React.ReactNode

  children: React.ReactNode

}) {

  return (

    <button

      type="button"

      onClick={onClick}

      className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${

        active

          ? 'border-teal-600 text-teal-700'

          : 'border-transparent text-slate-500 hover:text-slate-800'

      }`}

    >

      {icon}

      {children}

    </button>

  )

}



function Loading() {

  return (

    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">

      <RefreshCw size={17} className="animate-spin" />

      Loading relief supply data...

    </div>

  )

}



function EmptyState({ message }: { message: string }) {

  return (

    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">

      <Boxes size={32} className="mx-auto text-slate-400" />

      <p className="mt-3 text-sm text-slate-500">{message}</p>

    </div>

  )

}
