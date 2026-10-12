import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Bell,
  Building2,
  House,
  LogOut,
  PackagePlus,
  RefreshCw,
  Send,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
const API_URL = 'http://localhost:3000/api'
const CATEGORIES = [
  { value: 'FOOD', label: 'Food' },
  { value: 'WATER', label: 'Water' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'CLOTHING', label: 'Clothing' },
  { value: 'HYGIENE', label: 'Hygiene' },
  { value: 'SHELTER_EQUIPMENT', label: 'Shelter Equipment' },
  { value: 'OTHER', label: 'Other' },
] as const
const UNITS = [
  { value: 'PIECES', label: 'Pieces' },
  { value: 'PACKETS', label: 'Packets' },
  { value: 'BOXES', label: 'Boxes' },
  { value: 'KILOGRAMS', label: 'Kilograms' },
  { value: 'LITRES', label: 'Litres' },
  { value: 'BOTTLES', label: 'Bottles' },
  { value: 'SETS', label: 'Sets' },
] as const
interface ShelterStaffDashboardProps {
  token: string
  fullName: string
  email: string
  district?: string
  onLogout: () => void
}
interface AssignedShelter {
  _id?: string
  id?: string
  name: string
  shelterCode?: string
  district?: string
  address?: string
  operationalStatus?: string
  maximumCapacity?: number
  isActive?: boolean
}
interface ReliefRequest {
  _id: string
  shelterId?: string | { _id?: string; name?: string; shelterCode?: string }
  category: string
  itemName: string
  unit: string
  requestedQuantity: number
  reason: string
  status: string
  decisionNotes?: string
  createdAt?: string
  reviewedAt?: string
}
interface ApiError {
  message?: string | string[]
}
function getErrorMessage(data: ApiError | null, fallback: string) {
  if (Array.isArray(data?.message)) {
    return data.message.join(', ')
  }
  return typeof data?.message === 'string' ? data.message : fallback
}
function getStatusClasses(status: string) {
  switch (status) {
    case 'APPROVED':
    case 'ALLOCATED':
      return 'bg-green-100 text-green-700'
    case 'PARTIALLY_ALLOCATED':
      return 'bg-blue-100 text-blue-700'
    case 'REJECTED':
    case 'CANCELLED':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-amber-100 text-amber-700'
  }
}
function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}
export default function ShelterStaffDashboard({
  token,
  fullName,
  email,
  district,
  onLogout,
}: ShelterStaffDashboardProps) {
  const [activeSection, setActiveSection] = useState<'shelter' | 'requests' | 'myRequests'>('shelter')
  const [shelter, setShelter] = useState<AssignedShelter | null>(null)
  const [isLoadingShelter, setIsLoadingShelter] = useState(true)
  const [shelterError, setShelterError] = useState('')
  const [requests, setRequests] = useState<ReliefRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [requestListError, setRequestListError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [requestSuccess, setRequestSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [category, setCategory] = useState('FOOD')
  const [itemName, setItemName] = useState('')
  const [unit, setUnit] = useState('PIECES')
  const [requestedQuantity, setRequestedQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const shelterId = shelter?._id ?? shelter?.id
  const loadShelter = useCallback(async () => {
    setIsLoadingShelter(true)
    setShelterError('')
    try {
      const response = await fetch(`${API_URL}/shelters`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Unable to load your shelter (HTTP ${response.status}).`,
          ),
        )
      }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.shelters)
            ? data.shelters
            : []
      // The endpoint must return shelters assigned to this staff member.
      const assignedShelter = list.find(
        (item: AssignedShelter) => item._id || item.id,
      ) as AssignedShelter | undefined
      if (!assignedShelter) {
        setShelter(null)
        setShelterError(
          'No assigned shelter was returned. Please check the shelter API permissions and your staff account assignment.',
        )
        return
      }
      setShelter(assignedShelter)
    } catch (error) {
      setShelter(null)
      setShelterError(
        error instanceof Error
          ? error.message
          : 'Unable to connect to the server.',
      )
    } finally {
      setIsLoadingShelter(false)
    }
  }, [token])
  const loadMyRequests = useCallback(async () => {
    setIsLoadingRequests(true)
    setRequestListError('')
    try {
      const response = await fetch(
        `${API_URL}/relief-supply-requests/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Unable to load relief requests (HTTP ${response.status}).`,
          ),
        )
      }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : []
      setRequests(list)
    } catch (error) {
      setRequestListError(
        error instanceof Error
          ? error.message
          : 'Unable to load relief requests.',
      )
    } finally {
      setIsLoadingRequests(false)
    }
  }, [token])
  useEffect(() => {
    void loadShelter()
    void loadMyRequests()
  }, [loadShelter, loadMyRequests])
  async function handleSubmitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRequestError('')
    setRequestSuccess('')
    if (!shelterId) {
      setRequestError(
        'Your assigned shelter could not be identified. Please refresh the shelter details.',
      )
      return
    }
    const quantity = Number(requestedQuantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      setRequestError('Quantity must be a whole number greater than zero.')
      return
    }
    if (!itemName.trim() || !reason.trim()) {
      setRequestError('Please complete the item name and reason fields.')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch(
        `${API_URL}/relief-supply-requests`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            shelterId,
            category,
            itemName: itemName.trim(),
            unit,
            requestedQuantity: quantity,
            reason: reason.trim(),
          }),
        },
      )
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Unable to submit the request (HTTP ${response.status}).`,
          ),
        )
      }
      setRequestSuccess('Relief supply request submitted successfully.')
      setItemName('')
      setRequestedQuantity('1')
      setReason('')
      await loadMyRequests()
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : 'Unable to submit the request. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }
  const navigationItems = [
    { id: 'shelter', label: 'My Shelter', icon: Building2 },
    { id: 'requests', label: 'Request Relief Supplies', icon: PackagePlus },
    { id: 'myRequests', label: 'My Supply Requests', icon: ClipboardList },
  ] as const
  const activeTitle =
    navigationItems.find((item) => item.id === activeSection)?.label ??
    'My Shelter'
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
          <div className="rounded-xl bg-amber-500 p-2.5 text-white">
            <House size={25} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">Disaster Management</h1>
            <p className="text-xs text-slate-500">Shelter Portal</p>
          </div>
        </div>
        <nav className="space-y-1 px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Shelter operations
          </p>
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id)
                  setRequestError('')
                  setRequestSuccess('')
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
                  isActive
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={19} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto border-t border-slate-200 p-4">
          <div className="mb-3 rounded-lg bg-slate-50 p-3">
            <p className="truncate text-sm font-semibold text-slate-800">
              {fullName}
            </p>
            <p className="truncate text-xs text-slate-500">{email}</p>
            <p className="mt-2 text-xs font-medium text-amber-700">
              Shelter Staff
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={19} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div>
            <p className="text-sm text-slate-500">
              Shelter operations / {activeTitle}
            </p>
            <h2 className="text-lg font-bold text-slate-900">
              Shelter Staff Dashboard
            </h2>
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
          >
            <Bell size={19} />
          </button>
        </header>
        <main className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8">
          <section>
            <p className="text-sm font-medium text-amber-700">Welcome back</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Hello, {fullName}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage your assigned shelter and relief supply requests.
            </p>
            {district && (
              <p className="mt-2 text-sm font-medium text-slate-600">
                District: {district}
              </p>
            )}
          </section>
          {activeSection === 'shelter' && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <SummaryCard
                  title="Shelter Capacity"
                  value={
                    shelter?.maximumCapacity != null
                      ? String(shelter.maximumCapacity)
                      : '—'
                  }
                  description="Maximum supported occupants"
                  icon={<Building2 size={22} />}
                />
              </section>
              <section className="grid gap-6 xl:grid-cols-2">
                <article className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                      <Building2 size={23} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">
                        My Assigned Shelter
                      </h3>
                      <p className="text-sm text-slate-500">
                        Shelter details and operational status
                      </p>
                    </div>
                  </div>
                  {isLoadingShelter ? (
                    <LoadingMessage message="Loading your assigned shelter..." />
                  ) : shelter ? (
                    <div className="mt-6 space-y-3 rounded-lg bg-slate-50 p-4">
                      <DetailRow label="Shelter name" value={shelter.name} />
                      <DetailRow
                        label="Shelter code"
                        value={shelter.shelterCode || '—'}
                      />
                      <DetailRow
                        label="District"
                        value={shelter.district || district || '—'}
                      />
                      <DetailRow
                        label="Address"
                        value={shelter.address || '—'}
                      />
                      <DetailRow
                        label="Operational status"
                        value={shelter.operationalStatus || '—'}
                      />
                    </div>
                  ) : (
                    <ErrorMessage
                      message={shelterError || 'Assigned shelter not found.'}
                      onRetry={() => void loadShelter()}
                    />
                  )}
                </article>
              </section>
            </>
          )}
          {activeSection === 'requests' && (
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                  <PackagePlus size={23} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    Request Relief Supplies
                  </h3>
                  <p className="text-sm text-slate-500">
                    Submit a supply request for your assigned shelter.
                  </p>
                </div>
              </div>
              {shelter && (
                <div className="mb-5 rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assigned shelter
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {shelter.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {shelter.shelterCode || ''}
                  </p>
                </div>
              )}
              {requestError && <ErrorBanner message={requestError} />}
              {requestSuccess && (
                <SuccessBanner message={requestSuccess} />
              )}
              {!shelterId ? (
                <ErrorMessage
                  message={
                    isLoadingShelter
                      ? 'Please wait while your assigned shelter loads.'
                      : shelterError ||
                        'Your assigned shelter ID is not available. Requests cannot be submitted yet.'
                  }
                  onRetry={() => void loadShelter()}
                />
              ) : (
                <form onSubmit={handleSubmitRequest} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Category">
                      <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        required
                        className={inputClasses}
                      >
                        {CATEGORIES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Item name">
                      <input
                        type="text"
                        value={itemName}
                        onChange={(event) => setItemName(event.target.value)}
                        maxLength={100}
                        placeholder="e.g. Drinking water"
                        required
                        className={inputClasses}
                      />
                    </FormField>
                    <FormField label="Unit">
                      <select
                        value={unit}
                        onChange={(event) => setUnit(event.target.value)}
                        required
                        className={inputClasses}
                      >
                        {UNITS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Requested quantity">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={requestedQuantity}
                        onChange={(event) =>
                          setRequestedQuantity(event.target.value)
                        }
                        required
                        className={inputClasses}
                      />
                    </FormField>
                  </div>
                  <FormField label="Reason for request">
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={500}
                      rows={4}
                      placeholder="Explain why the shelter needs these supplies..."
                      required
                      className={inputClasses}
                    />
                  </FormField>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoadingShelter}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send size={17} />
                      {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}
          {activeSection === 'myRequests' && (
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                    <ClipboardList size={23} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      My Supply Requests
                    </h3>
                    <p className="text-sm text-slate-500">
                      Track requests for your assigned shelter.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadMyRequests()}
                  disabled={isLoadingRequests}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={isLoadingRequests ? 'animate-spin' : ''}
                  />
                  Refresh
                </button>
              </div>
              {requestListError && (
                <ErrorMessage
                  message={requestListError}
                  onRetry={() => void loadMyRequests()}
                />
              )}
              {isLoadingRequests ? (
                <LoadingMessage message="Loading your requests..." />
              ) : requests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <ClipboardList
                    size={32}
                    className="mx-auto mb-3 text-slate-400"
                  />
                  <p className="font-medium text-slate-700">
                    No relief requests found
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Your submitted requests will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <article
                      key={request._id}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {request.itemName}
                          </h4>
                          <p className="mt-1 text-sm text-slate-500">
                            {request.category.replaceAll('_', ' ')}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(request.status)}`}
                        >
                          {request.status.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <DetailRow
                          label="Quantity"
                          value={`${request.requestedQuantity} ${request.unit.toLowerCase()}`}
                        />
                        <DetailRow
                          label="Submitted"
                          value={formatDate(request.createdAt)}
                        />
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Reason
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {request.reason}
                        </p>
                      </div>
                      {request.decisionNotes && (
                        <div className="mt-3 rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Review notes
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {request.decisionNotes}
                          </p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          <footer className="border-t border-slate-200 pt-5 text-xs text-slate-400">
            Disaster Management System · Shelter Portal
          </footer>
        </main>
      </div>
    </div>
  )
}
const inputClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50'
interface SummaryCardProps {
  title: string
  value: string
  description: string
  icon: ReactNode
}
function SummaryCard({
  title,
  value,
  description,
  icon,
}: SummaryCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </article>
  )
}
function FormField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  )
}
function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  )
}
function LoadingMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
      <RefreshCw size={17} className="animate-spin" />
      {message}
    </div>
  )
}
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
function SuccessBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
    >
      <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
function ErrorMessage({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4"
    >
      <div className="flex items-start gap-2 text-sm text-red-700">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
      >
        <RefreshCw size={15} />
        Try again
      </button>
    </div>
  )
}
