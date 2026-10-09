import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Megaphone,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Smartphone,
  X,
  XCircle,
} from 'lucide-react'

const API_URL = 'http://localhost:3000/api'

export type AlertSeverity = 'INFORMATION' | 'WATCH' | 'WARNING' | 'EMERGENCY'
export type AlertStatus = 'PUBLISHED' | 'CANCELLED'

export interface HazardAlertItem {
  _id: string
  title: string
  message: string
  safetyInstructions: string
  hazardType: string
  severity: AlertSeverity
  affectedDistricts: string[]
  affectedCities: string[]
  publishedBy: string
  status: AlertStatus
  publishedAt: string
  cancelledAt?: string
  cancellationReason?: string
  createdAt?: string
}

export interface DeliveryRecord {
  _id: string
  recipientId: string
  channel: 'PUSH' | 'WHATSAPP'
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
  providerMessageId?: string
  failureReason?: string
  sentAt?: string
  deliveredAt?: string
  createdAt?: string
}


interface DisasterWarningsSectionProps {
  token: string
  registeredDistrict?: string
  assignedDistricts?: string[]
  role?: string
  onActiveCountChange?: (count: number) => void
}

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    label: string
    badge: string
    dot: string
    border: string
    bgLight: string
    iconColor: string
  }
> = {
  EMERGENCY: {
    label: 'Emergency Red Alert',
    badge: 'bg-red-600 text-white shadow-xs',
    dot: 'bg-red-500 animate-ping',
    border: 'border-red-300',
    bgLight: 'bg-red-50/70',
    iconColor: 'text-red-600',
  },
  WARNING: {
    label: 'Warning Alert',
    badge: 'bg-amber-500 text-white shadow-xs',
    dot: 'bg-amber-400',
    border: 'border-amber-300',
    bgLight: 'bg-amber-50/70',
    iconColor: 'text-amber-600',
  },
  WATCH: {
    label: 'Advisory Watch',
    badge: 'bg-yellow-500 text-slate-900 shadow-xs',
    dot: 'bg-yellow-400',
    border: 'border-yellow-300',
    bgLight: 'bg-yellow-50/70',
    iconColor: 'text-yellow-600',
  },
  INFORMATION: {
    label: 'Public Information',
    badge: 'bg-blue-600 text-white shadow-xs',
    dot: 'bg-blue-400',
    border: 'border-blue-300',
    bgLight: 'bg-blue-50/70',
    iconColor: 'text-blue-600',
  },
}

export default function DisasterWarningsSection({
  token,
  registeredDistrict,
  assignedDistricts,
  onActiveCountChange,
}: DisasterWarningsSectionProps) {
  // Districts loaded from backend
  const [districtsList, setDistrictsList] = useState<string[]>([])
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false)

  // Combined districts set
  const allDistricts = useMemo(() => {
    const combined = new Set<string>()
    if (registeredDistrict) combined.add(registeredDistrict)
    if (assignedDistricts) {
      assignedDistricts.forEach((d) => d && combined.add(d))
    }
    districtsList.forEach((d) => d && combined.add(d))
    return Array.from(combined).sort((a, b) => a.localeCompare(b))
  }, [districtsList, registeredDistrict, assignedDistricts])

  // Active district filter
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    registeredDistrict || 'ALL',
  )

  // Alerts data
  const [alerts, setAlerts] = useState<HazardAlertItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [alertToCancel, setAlertToCancel] = useState<HazardAlertItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [selectedAlertForDeliveries, setSelectedAlertForDeliveries] =
    useState<HazardAlertItem | null>(null)
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([])
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Create form state
  const [formTitle, setFormTitle] = useState('')
  const [formSeverity, setFormSeverity] = useState<AlertSeverity>('EMERGENCY')
  const [formHazardType, setFormHazardType] = useState('FLOOD')
  const [formDistricts, setFormDistricts] = useState<string[]>([])
  const [formCities, setFormCities] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formSafetyInstructions, setFormSafetyInstructions] = useState('')

  // 1. Fetch dynamic districts from backend
  const fetchDistricts = useCallback(async () => {
    setIsLoadingDistricts(true)
    try {
      const res = await fetch(`${API_URL}/reports/districts`, {
        headers: { Accept: 'application/json' },
      })
      const result = await res.json().catch(() => null)
      if (res.ok && Array.isArray(result?.data)) {
        setDistrictsList(result.data)
      }
    } catch {
      // silent fallback
    } finally {
      setIsLoadingDistricts(false)
    }
  }, [])

  useEffect(() => {
    void fetchDistricts()
  }, [fetchDistricts])

  // 2. Fetch published hazard alerts from backend API
  const fetchAlerts = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/hazard-alerts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      const result = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(result?.message || 'Failed to fetch hazard alerts')
      }
      const list = Array.isArray(result?.data) ? result.data : []
      setAlerts(list)
      const activeCount = list.filter((a: HazardAlertItem) => a.status === 'PUBLISHED').length
      onActiveCountChange?.(activeCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch alerts')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    void fetchAlerts()
  }, [fetchAlerts])

  // 3. Fetch deliveries for an alert
  const fetchDeliveriesForAlert = async (alertItem: HazardAlertItem) => {
    setSelectedAlertForDeliveries(alertItem)
    setIsLoadingDeliveries(true)
    try {
      const res = await fetch(`${API_URL}/hazard-alerts/${alertItem._id}/deliveries`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      const result = await res.json().catch(() => null)
      if (res.ok && result?.data) {
        setDeliveries(Array.isArray(result.data.records) ? result.data.records : [])
      }
    } catch {
      // silent fallback
    } finally {
      setIsLoadingDeliveries(false)
    }
  }

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormTitle('')
    setFormSeverity('EMERGENCY')
    setFormHazardType('FLOOD')
    setFormDistricts(
      selectedDistrict !== 'ALL'
        ? [selectedDistrict]
        : registeredDistrict
          ? [registeredDistrict]
          : [],
    )
    setFormCities('All Cities')
    setFormMessage('')
    setFormSafetyInstructions('')
    setFormError('')
    setShowCreateModal(true)
  }

  // Handle District checkbox toggle in form
  const toggleDistrictInForm = (dist: string) => {
    setFormDistricts((prev) =>
      prev.includes(dist) ? prev.filter((d) => d !== dist) : [...prev, dist],
    )
  }

  // Submit Create Hazard Alert
  const handleSubmitCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setFormError('Alert Title is required.')
      return
    }
    if (formDistricts.length === 0) {
      setFormError('Please select at least one affected district.')
      return
    }
    if (!formMessage.trim()) {
      setFormError('Alert Message is required.')
      return
    }
    if (!formSafetyInstructions.trim()) {
      setFormError('Safety instructions are required for public broadcast.')
      return
    }

    try {
      setIsSubmitting(true)
      setFormError('')

      const rawCities = formCities
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
      const finalCities = rawCities.length > 0 ? rawCities : ['All Cities']

      const payload = {
        title: formTitle.trim(),
        message: formMessage.trim(),
        safetyInstructions: formSafetyInstructions.trim(),
        hazardType: formHazardType.trim(),
        severity: formSeverity,
        affectedDistricts: formDistricts,
        affectedCities: finalCities,
      }

      const res = await fetch(`${API_URL}/hazard-alerts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(result?.message || 'Failed to publish hazard alert.')
      }

      setShowCreateModal(false)
      void fetchAlerts()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error publishing alert')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Cancel Alert
  const handleCancelAlertSubmit = async () => {
    if (!alertToCancel) return
    if (!cancelReason.trim()) {
      alert('Please enter a cancellation reason.')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`${API_URL}/hazard-alerts/${alertToCancel._id}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Failed to cancel alert.')
      }

      setAlertToCancel(null)
      setCancelReason('')
      void fetchAlerts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error cancelling alert')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // District filter
      if (selectedDistrict !== 'ALL') {
        const distMatch = alert.affectedDistricts.some(
          (d) => d.toLowerCase() === selectedDistrict.toLowerCase(),
        )
        if (!distMatch) return false
      }

      // Severity filter
      if (selectedSeverity !== 'ALL' && alert.severity !== selectedSeverity) {
        return false
      }

      // Status filter
      if (selectedStatus !== 'ALL' && alert.status !== selectedStatus) {
        return false
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchTitle = alert.title?.toLowerCase().includes(q)
        const matchMsg = alert.message?.toLowerCase().includes(q)
        const matchHazard = alert.hazardType?.toLowerCase().includes(q)
        const matchCities = alert.affectedCities?.some((c) =>
          c.toLowerCase().includes(q),
        )
        const matchDist = alert.affectedDistricts?.some((d) =>
          d.toLowerCase().includes(q),
        )
        if (!matchTitle && !matchMsg && !matchHazard && !matchCities && !matchDist) {
          return false
        }
      }

      return true
    })
  }, [alerts, selectedDistrict, selectedSeverity, selectedStatus, searchTerm])

  // Aggregate Metrics
  const activeAlertsCount = useMemo(
    () => alerts.filter((a) => a.status === 'PUBLISHED').length,
    [alerts],
  )
  const emergencyCount = useMemo(
    () => alerts.filter((a) => a.severity === 'EMERGENCY' && a.status === 'PUBLISHED').length,
    [alerts],
  )

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-xs">
              <Megaphone size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Disaster Early Warnings & Public Alerts
                </h2>
                {selectedDistrict === registeredDistrict && registeredDistrict && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                    <Shield size={12} />
                    Registered Duty District
                  </span>
                )}
                {selectedDistrict === 'ALL' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    National DMC Broadcast Network
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Issue verified disaster warning bulletins with instant automated Mobile Push notifications (FCM) and WhatsApp emergency alerts.
              </p>
            </div>
          </div>

          {/* Action buttons & District Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* District Quick Select */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
              <button
                type="button"
                onClick={() => setSelectedDistrict('ALL')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  selectedDistrict === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                All Districts
              </button>
              {registeredDistrict && (
                <button
                  type="button"
                  onClick={() => setSelectedDistrict(registeredDistrict)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    selectedDistrict === registeredDistrict
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  ★ {registeredDistrict}
                </button>
              )}
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={isLoadingDistricts && allDistricts.length === 0}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
              >
                <option value="ALL">All Districts (Islandwide)</option>
                {allDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d} District {d === registeredDistrict ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Issue Warning Alert Button (DMC Officer only) */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-98"
            >
              <Plus size={16} />
              Issue Early Warning Alert
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Active Warnings
              </p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {isLoading ? '…' : activeAlertsCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Currently published & broadcast
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-2.5 text-red-600">
              <Megaphone size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Emergency Red Alerts
              </p>
              <p className="mt-2 text-3xl font-extrabold text-red-600">
                {isLoading ? '…' : emergencyCount}
              </p>
              <p className="mt-1 text-xs text-red-600 font-medium">
                Life safety / Evacuation level
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-2.5 text-red-600">
              <ShieldAlert size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Mobile Push Channel
              </p>
              <p className="mt-2 text-3xl font-extrabold text-indigo-700">
                Active
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Firebase Cloud Messaging (FCM)
              </p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700">
              <Smartphone size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                WhatsApp Alert Channel
              </p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-700">
                Active
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Meta WhatsApp Business API
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700">
              <MessageSquare size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Channels Information Box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex items-start gap-3">
          <Radio size={20} className="shrink-0 text-amber-700 mt-0.5" />
          <div className="text-xs text-slate-700">
            <span className="font-bold text-amber-900">
              Automated Citizen Multi-Channel Dispatch:
            </span>{' '}
            When an Early Warning Alert is issued, the backend immediately queries all active registered citizens in the targeted district(s) and city areas. Alerts are automatically dispatched via{' '}
            <strong className="text-slate-900">Mobile Push notifications (Flutter FCM)</strong> and{' '}
            <strong className="text-slate-900">WhatsApp message templates</strong> directly to citizen smartphones.
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search alerts by title, message, hazard, district, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50/50 py-2 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-red-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Severity:
              </span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-red-500"
              >
                <option value="ALL">All Severities</option>
                <option value="EMERGENCY">Emergency (Red Alert)</option>
                <option value="WARNING">Warning</option>
                <option value="WATCH">Watch / Advisory</option>
                <option value="INFORMATION">Information</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Status:
              </span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-red-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published / Active</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchAlerts}
              disabled={isLoading}
              title="Refresh alerts"
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50 active:rotate-180"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Alerts Feed */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-400">
            <RefreshCw size={24} className="animate-spin text-red-600" />
            <p className="text-xs font-medium">Loading disaster warnings from backend database...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center">
            <div className="rounded-full bg-slate-100 p-4 text-slate-400">
              <Megaphone size={32} />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-800">
              No warning alerts matching criteria
            </h4>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {selectedDistrict !== 'ALL'
                ? `No warning alerts currently active in ${selectedDistrict} District.`
                : 'No early warning bulletins currently issued.'}
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700"
            >
              <Plus size={14} />
              Issue Early Warning Alert
            </button>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFORMATION
            const isCancelled = alert.status === 'CANCELLED'

            return (
              <div
                key={alert._id}
                className={`overflow-hidden rounded-2xl border transition shadow-xs ${
                  isCancelled
                    ? 'border-slate-200 bg-slate-50/70 opacity-80'
                    : `${sev.border} bg-white`
                }`}
              >
                {/* Alert Top Bar */}
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 ${
                    isCancelled ? 'border-slate-200 bg-slate-100/60' : `${sev.bgLight} border-slate-200`
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                        isCancelled
                          ? 'bg-slate-300 text-slate-700'
                          : sev.badge
                      }`}
                    >
                      {!isCancelled && (
                        <span className={`h-2 w-2 rounded-full ${sev.dot}`} />
                      )}
                      {isCancelled ? 'CANCELLED ALERT' : sev.label}
                    </span>

                    <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Hazard: {alert.hazardType}
                    </span>

                    <span className="text-xs text-slate-500 font-medium">
                      Issued: {new Date(alert.publishedAt || alert.createdAt || '').toLocaleString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* View Deliveries Button */}
                    <button
                      type="button"
                      onClick={() => fetchDeliveriesForAlert(alert)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                    >
                      <Smartphone size={13} className="text-indigo-600" />
                      <MessageSquare size={13} className="text-emerald-600" />
                      Dispatch Deliveries
                    </button>

                    {/* Cancel button */}
                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => {
                          setAlertToCancel(alert)
                          setCancelReason('')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        <XCircle size={14} />
                        Cancel Alert
                      </button>
                    )}
                  </div>
                </div>

                {/* Alert Body */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                      {alert.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {alert.message}
                    </p>
                  </div>

                  {/* Safety & Evacuation Instructions Box */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="shrink-0 text-amber-700 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                          Official Safety & Evacuation Instructions
                        </h4>
                        <p className="mt-1 text-xs text-amber-950 font-medium whitespace-pre-line">
                          {alert.safetyInstructions}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Geographic Scope */}
                  <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500">Affected Districts:</span>
                      <div className="flex flex-wrap gap-1">
                        {alert.affectedDistricts.map((d, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-800"
                          >
                            <MapPin size={11} className="text-red-500" />
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500">Target Cities / Towns:</span>
                      <div className="flex flex-wrap gap-1">
                        {alert.affectedCities.map((c, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* If Cancelled Notice */}
                  {isCancelled && alert.cancellationReason && (
                    <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600 border border-slate-200">
                      <strong>Stand-down / Cancellation Reason:</strong>{' '}
                      {alert.cancellationReason} (Cancelled at{' '}
                      {new Date(alert.cancelledAt || '').toLocaleString()})
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MODAL: ISSUE NEW WARNING ALERT */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-100 p-2.5 text-red-600">
                <Megaphone size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Issue Public Early Warning Alert
                </h3>
                <p className="text-xs text-slate-500">
                  Broadcasts official disaster bulletins and triggers immediate Mobile Push (FCM) & WhatsApp alerts.
                </p>
              </div>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitCreate} className="mt-6 space-y-4">
              {/* Alert Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Alert Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Red Alert: Severe Flood Warning in Kelani River Basin"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-red-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Severity Level */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Severity Level *
                  </label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as AlertSeverity)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-red-500"
                  >
                    <option value="EMERGENCY">🔴 EMERGENCY (Evacuation / Immediate Threat)</option>
                    <option value="WARNING">🟠 WARNING (Severe Threat Developing)</option>
                    <option value="WATCH">🟡 WATCH (Advisory / Heightened Monitoring)</option>
                    <option value="INFORMATION">🔵 INFORMATION (Public Notice / Weather Advisory)</option>
                  </select>
                </div>

                {/* Hazard Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Hazard Classification *
                  </label>
                  <select
                    value={formHazardType}
                    onChange={(e) => setFormHazardType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-red-500"
                  >
                    <option value="FLOOD">Flood / Flash Flood</option>
                    <option value="RISING_WATER">Rising Water Level</option>
                    <option value="LANDSLIDE">Landslide / Slope Failure</option>
                    <option value="STRONG_WIND">Cyclone / Gale Force Winds</option>
                    <option value="TSUNAMI">Tsunami / Coastal Surge</option>
                    <option value="FIRE">Wildfire / Structural Fire</option>
                    <option value="EARTHQUAKE">Earthquake / Tremor</option>
                    <option value="BLOCKED_ROAD">Major Route Inundation / Blockage</option>
                    <option value="OTHER">Other Emergency Threat</option>
                  </select>
                </div>
              </div>

              {/* Affected Districts */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Targeted Districts * ({formDistricts.length} selected)
                </label>
                <div className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allDistricts.map((d) => {
                      const isChecked = formDistricts.includes(d)
                      return (
                        <label
                          key={d}
                          className={`flex items-center gap-2 rounded-md p-1.5 text-xs font-medium cursor-pointer transition ${
                            isChecked
                              ? 'bg-red-50 text-red-900 border border-red-200 font-bold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDistrictInForm(d)}
                            className="rounded text-red-600 focus:ring-red-500"
                          />
                          <span>{d}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Affected Cities */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Targeted Cities / Local Areas (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kelaniya, Biyagama, Kaduwela, Kolonnawa (or All Cities)"
                  value={formCities}
                  onChange={(e) => setFormCities(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-red-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Enter specific towns or type &quot;All Cities&quot; to broadcast to the entire district population.
                </p>
              </div>

              {/* Alert Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Warning Message & Bulletin Description *
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide precise details of the current disaster situation, river gauge readings, or meteorological warning..."
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-red-500"
                />
              </div>

              {/* Safety Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Public Safety & Evacuation Instructions *
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Move immediately to nearest emergency shelter. Do not cross swollen culverts. Keep emergency battery radio active..."
                  value={formSafetyInstructions}
                  onChange={(e) => setFormSafetyInstructions(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-red-500"
                />
              </div>

              {/* Multi-channel dispatch notice */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900">
                <div className="flex items-center gap-2 font-bold text-blue-950 mb-1">
                  <Send size={15} />
                  Automatic Dispatch Channels Triggered:
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-blue-800">
                  <li>
                    <strong>Flutter Mobile Push (FCM)</strong>: Dispatched to registered citizens with devices registered in selected districts.
                  </li>
                  <li>
                    <strong>WhatsApp Cloud Alerts</strong>: Dispatched via official template API to opted-in citizens.
                  </li>
                  <li>
                    <strong>DMC Public Bulletin</strong>: Displayed on the live warning feed across portals.
                  </li>
                </ul>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Broadcasting Alert...' : 'Broadcast Public Warning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DELIVERIES (MOBILE PUSH & WHATSAPP METRICS) */}
      {selectedAlertForDeliveries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setSelectedAlertForDeliveries(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
                <Radio size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                  Notification Dispatch Deliveries
                </h3>
                <p className="text-xs text-slate-500">
                  Mobile Push (FCM) & WhatsApp message tracking for &quot;{selectedAlertForDeliveries.title}&quot;
                </p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Dispatched</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{deliveries.length}</p>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5">
                <p className="text-[11px] font-semibold text-indigo-700 uppercase flex items-center gap-1">
                  <Smartphone size={13} /> Mobile Push
                </p>
                <p className="mt-1 text-2xl font-extrabold text-indigo-900">
                  {deliveries.filter((d) => d.channel === 'PUSH').length}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                <p className="text-[11px] font-semibold text-emerald-700 uppercase flex items-center gap-1">
                  <MessageSquare size={13} /> WhatsApp
                </p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-900">
                  {deliveries.filter((d) => d.channel === 'WHATSAPP').length}
                </p>
              </div>

              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5">
                <p className="text-[11px] font-semibold text-teal-700 uppercase flex items-center gap-1">
                  <CheckCircle2 size={13} /> Delivered / Sent
                </p>
                <p className="mt-1 text-2xl font-extrabold text-teal-900">
                  {
                    deliveries.filter((d) => d.status === 'SENT' || d.status === 'DELIVERED')
                      .length
                  }
                </p>
              </div>
            </div>

            {/* Deliveries Table */}
            <div className="mt-5 rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">
                  Recipient Dispatch Log ({deliveries.length})
                </span>
              </div>

              {isLoadingDeliveries ? (
                <div className="flex h-40 items-center justify-center text-slate-400 gap-2 text-xs">
                  <RefreshCw size={18} className="animate-spin text-indigo-600" />
                  <span>Loading delivery log...</span>
                </div>
              ) : deliveries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No delivery attempts recorded yet for this alert bulletin.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">Channel</th>
                        <th className="px-4 py-2.5">Recipient ID</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Timestamp</th>
                        <th className="px-4 py-2.5">Provider Info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {deliveries.map((deliv) => (
                        <tr key={deliv._id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            {deliv.channel === 'PUSH' ? (
                              <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                                <Smartphone size={11} /> FCM Push
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                <MessageSquare size={11} /> WhatsApp
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">
                            {deliv.recipientId}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                deliv.status === 'DELIVERED' || deliv.status === 'SENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : deliv.status === 'FAILED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {deliv.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                            {new Date(deliv.sentAt || deliv.createdAt || '').toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-2.5 text-[11px] text-slate-500">
                            {deliv.failureReason ? (
                              <span className="text-red-600">{deliv.failureReason}</span>
                            ) : deliv.providerMessageId ? (
                              <span className="font-mono text-slate-600">
                                {deliv.providerMessageId}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAlertForDeliveries(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL WARNING ALERT */}
      {alertToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-100 p-2.5 text-red-600">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cancel Public Warning Alert
                </h3>
                <p className="text-xs text-slate-500">
                  Issues official stand-down bulletin for &quot;{alertToCancel.title}&quot;
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700">
                Cancellation Reason & Stand-Down Advice *
              </label>
              <textarea
                rows={3}
                placeholder="e.g. River levels have subsided below alert threshold. Weather forecast cleared."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAlertToCancel(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep Alert Active
              </button>
              <button
                type="button"
                onClick={handleCancelAlertSubmit}
                disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
