import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

import { apiRequest, asArray, getId, getShelterName, humanize } from './relief-supplies/api'
import SupplyDistributionSection from './relief-supplies/SupplyDistributionSection'
import SupplyInventorySection from './relief-supplies/SupplyInventorySection'
import SupplyOverview from './relief-supplies/SupplyOverview'
import SupplyRequestReviewModal from './relief-supplies/SupplyRequestReviewModal'
import SupplyRequestsSection from './relief-supplies/SupplyRequestsSection'
import type {
  Category,
  Distribution,
  DistributionStatus,
  ReliefSuppliesTab,
  ReviewDecision,
  Shelter,
  Supply,
  SupplyRequest,
  Unit,
} from './relief-supplies/types'

interface Props {
  token: string
  role: string
  district?: string
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100'

export default function ReliefSuppliesPage({ token, role, district }: Props) {
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState('')
  const [pendingReview, setPendingReview] = useState<{ request: SupplyRequest; decision: ReviewDecision } | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<ReliefSuppliesTab>('inventory')

  // REVIEW [ISP/Long Parameter List]: register-form state lives here, forcing 24 props into SupplyInventorySection - move it into that section.
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
      const [supplyResult, shelterResult, distributionResult] = await Promise.all([
        apiRequest<unknown>('/relief-supplies', token),
        apiRequest<unknown>('/shelters', token),
        apiRequest<unknown>('/relief-supplies/distributions', token),
      ])
      setSupplies(asArray<Supply>(supplyResult))
      setShelters(asArray<Shelter>(shelterResult))
      setDistributions(asArray<Distribution>(distributionResult))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load relief supply information.')
    } finally {
      setLoading(false)
    }
  }, [token])

  // Load pending requests independently so a request API error does not
  // prevent the existing inventory and distribution screens from loading.
  const loadSupplyRequests = useCallback(async () => {
    setRequestsLoading(true)
    setRequestsError('')
    try {
      const result = await apiRequest<unknown>('/relief-supply-requests', token)
      setSupplyRequests(asArray<SupplyRequest>(result))
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : 'Unable to load shelter supply requests.')
    } finally {
      setRequestsLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadData()
  }, [loadData])

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
      (!shelter.operationalStatus || shelter.operationalStatus === 'OPEN') &&
      (!role.includes('DISTRICT_OFFICER') ||
        !district ||
        shelter.district?.toLowerCase() === district.toLowerCase()),
  )

  function changeTab(nextTab: ReliefSuppliesTab) {
    setTab(nextTab)
    if (nextTab === 'requests') void loadSupplyRequests()
  }

  function openReviewDialog(request: SupplyRequest, decision: ReviewDecision) {
    setPendingReview({ request, decision })
    setReviewNotes('')
    setReviewError('')
    setError('')
    setNotice('')
  }

  function closeReviewDialog() {
    setPendingReview(null)
    setReviewNotes('')
    setReviewError('')
  }

  async function confirmReviewSupplyRequest() {
    if (!pendingReview) return
    const { request, decision } = pendingReview

    setSaving(true)
    setReviewError('')
    setError('')
    setNotice('')
    setRequestsError('')
    try {
      await apiRequest(`/relief-supply-requests/${request._id}/decision`, token, {
        method: 'PATCH',
        body: JSON.stringify({ decision, decisionNotes: reviewNotes.trim() }),
      })
      closeReviewDialog()
      setNotice(
        decision === 'APPROVED'
          ? 'Request approved and supplies allocated successfully.'
          : 'Supply request rejected successfully.',
      )
      await Promise.all([loadSupplyRequests(), loadData()])
    } catch (err) {
      setReviewError(
        err instanceof Error
          ? err.message
          : `Unable to ${decision === 'APPROVED' ? 'approve' : 'reject'} the request.`,
      )
    } finally {
      setSaving(false)
    }
  }

  // REVIEW [Smell]: one shared `saving`/`error`/`notice` for every action - a failed allocation shows its error while on another tab.
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

  async function updateDistribution(distribution: Distribution, status: DistributionStatus) {
    setSaving(true)
    setError('')
    setNotice('')

    const body: {
      status: DistributionStatus
      dispatchedQuantity?: number
      deliveredQuantity?: number
      notes?: string
    } = { status, notes: distribution.notes ?? '' }

    if (status === 'DISPATCHED') {
      body.dispatchedQuantity = distribution.allocatedQuantity
    }
    if (status === 'DELIVERED') {
      body.dispatchedQuantity = distribution.allocatedQuantity
      body.deliveredQuantity = distribution.allocatedQuantity
    }

    try {
      await apiRequest(`/relief-supplies/distributions/${distribution._id}/status`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      setNotice(`Distribution updated to ${humanize(status)}.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update distribution.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            DMC Operations
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Relief Supplies</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage inventory, allocate supplies, and track shelter deliveries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadData()
            void loadSupplyRequests()
          }}
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

      <SupplyOverview
        supplies={supplies}
        distributions={distributions}
        pendingRequestCount={supplyRequests.filter((request) => request.status === 'PENDING').length}
        tab={tab}
        onTabChange={changeTab}
      />

      {tab === 'inventory' && (
        <SupplyInventorySection
          supplies={supplies}
          filteredSupplies={filteredSupplies}
          loading={loading}
          saving={saving}
          search={search}
          name={name}
          supplyCode={supplyCode}
          category={category}
          unit={unit}
          quantity={quantity}
          minimumStock={minimumStock}
          storageLocation={storageLocation}
          description={description}
          inputClass={inputClass}
          onSearchChange={setSearch}
          onNameChange={setName}
          onSupplyCodeChange={setSupplyCode}
          onCategoryChange={setCategory}
          onUnitChange={setUnit}
          onQuantityChange={setQuantity}
          onMinimumStockChange={setMinimumStock}
          onStorageLocationChange={setStorageLocation}
          onDescriptionChange={setDescription}
          onRegister={registerSupply}
        />
      )}

      {tab === 'distributions' && (
        <SupplyDistributionSection
          supplies={supplies}
          shelters={shelters}
          openShelters={openShelters}
          distributions={distributions}
          loading={loading}
          saving={saving}
          selectedSupplyId={selectedSupplyId}
          selectedShelterId={selectedShelterId}
          allocatedQuantity={allocatedQuantity}
          notes={notes}
          inputClass={inputClass}
          onSupplyChange={setSelectedSupplyId}
          onShelterChange={setSelectedShelterId}
          onQuantityChange={setAllocatedQuantity}
          onNotesChange={setNotes}
          onAllocate={allocateSupply}
          onUpdateDistribution={(distribution, status) =>
            void updateDistribution(distribution as Distribution, status)
          }
          getId={getId}
        />
      )}

      {tab === 'requests' && (
        <SupplyRequestsSection
          supplyRequests={supplyRequests}
          shelters={shelters}
          loading={requestsLoading}
          saving={saving}
          error={requestsError}
          onRetry={() => void loadSupplyRequests()}
          onReview={openReviewDialog}
        />
      )}

      {pendingReview && (
        <SupplyRequestReviewModal
          request={pendingReview.request}
          decision={pendingReview.decision}
          shelterName={getShelterName(pendingReview.request.shelterId, shelters)}
          supplies={supplies}
          notes={reviewNotes}
          saving={saving}
          error={reviewError}
          onNotesChange={setReviewNotes}
          onClose={closeReviewDialog}
          onConfirm={() => void confirmReviewSupplyRequest()}
        />
      )}
    </div>
  )
}
