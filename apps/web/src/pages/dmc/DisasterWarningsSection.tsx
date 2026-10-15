import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import type { DisasterReportItem } from './DisasterReportsSection'
import AffectedAreaMap, { type IncidentLocation } from './AffectedAreaMap'
import DropdownSelect from './DropdownSelect'
import type { MapShelter } from './ShelterMap'
import { SRI_LANKA_DISTRICTS } from './sriLankaDistricts'

const API_URL = 'http://localhost:3000/api'

export type AlertSeverity = 'INFORMATION' | 'WATCH' | 'WARNING' | 'EMERGENCY'
export type AlertStatus = 'PUBLISHED' | 'CANCELLED'
type NotificationChannel = 'SMS' | 'PUSH' | 'WHATSAPP'

export interface HazardAlertItem {
  _id: string
  title: string
  message: string
  safetyInstructions: string
  hazardType: string
  severity: AlertSeverity
  affectedDistricts: string[]
  affectedCities: string[]
  notificationChannels?: NotificationChannel[]
  sourceReportNumber?: string
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
  channel: NotificationChannel
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
  shelters?: MapShelter[]
  onActiveCountChange?: (count: number) => void
  reportDraft?: DisasterReportItem | null
  onReportDraftConsumed?: () => void
}

interface AlertForm {
  title: string
  hazardType: string
  severity: AlertSeverity | ''
  message: string
  safetyInstructions: string
  districts: string[]
  cities: string[]
  channels: NotificationChannel[]
  sourceReportId?: string
  sourceReportNumber?: string
}

const SEVERITY_OPTIONS: {
  value: AlertSeverity
  label: string
  hint: string
  badge: string
  selected: string
}[] = [
  {
    value: 'EMERGENCY',
    label: 'Emergency',
    hint: 'Immediate threat to life',
    badge: 'bg-red-100 text-red-800',
    selected: 'border-red-500 bg-red-50 ring-1 ring-red-500',
  },
  {
    value: 'WARNING',
    label: 'Warning',
    hint: 'Severe hazard developing',
    badge: 'bg-orange-100 text-orange-800',
    selected: 'border-orange-500 bg-orange-50 ring-1 ring-orange-500',
  },
  {
    value: 'WATCH',
    label: 'Watch',
    hint: 'Conditions favour a hazard',
    badge: 'bg-yellow-100 text-yellow-800',
    selected: 'border-yellow-500 bg-yellow-50 ring-1 ring-yellow-500',
  },
  {
    value: 'INFORMATION',
    label: 'Information',
    hint: 'Public advisory',
    badge: 'bg-blue-100 text-blue-800',
    selected: 'border-blue-500 bg-blue-50 ring-1 ring-blue-500',
  },
]

const HAZARD_OPTIONS: [string, string][] = [
  ['FLOOD', 'Flood'],
  ['RISING_WATER', 'Rising water'],
  ['LANDSLIDE', 'Landslide'],
  ['LANDSLIDE_CRACK', 'Landslide crack'],
  ['STRONG_WIND', 'Strong wind / cyclone'],
  ['TSUNAMI', 'Tsunami'],
  ['FIRE', 'Fire'],
  ['EARTHQUAKE', 'Earthquake'],
  ['BLOCKED_ROAD', 'Blocked road'],
  ['OTHER', 'Other'],
]

const CHANNEL_OPTIONS: [NotificationChannel, string][] = [
  ['SMS', 'SMS text message'],
  ['PUSH', 'Mobile push'],
  ['WHATSAPP', 'WhatsApp'],
]

const INPUT_CLASS =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500'
const LABEL_CLASS = 'block text-xs font-semibold text-slate-700'

const labelOf = (value: string) =>
  value.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())

function buildForm(
  draft: DisasterReportItem | null | undefined,
  defaultDistrict?: string,
): AlertForm {
  if (!draft) {
    return {
      title: '',
      hazardType: 'FLOOD',
      severity: '',
      message: '',
      safetyInstructions: '',
      districts: defaultDistrict ? [defaultDistrict] : [],
      cities: [],
      channels: ['SMS'],
    }
  }

  const hazard = draft.customHazardType || draft.hazardType || ''
  const area = draft.city || draft.manualLocation || ''
  const place = area || draft.district || 'the reported area'
  const description = draft.description?.trim()

  return {
    title: `${labelOf(hazard)} alert - ${place}`,
    hazardType: draft.hazardType || 'FLOOD',
    severity: '',
    message: description
      ? `Verified citizen report ${draft.reportNumber}: ${description}`.slice(0, 2000)
      : `Verified citizen report ${draft.reportNumber} reports ${labelOf(hazard).toLowerCase()} in ${place}.`,
    safetyInstructions: '',
    districts: draft.district ? [draft.district] : [],
    cities: draft.city ? [draft.city] : [],
    channels: ['SMS'],
    sourceReportId: draft._id || draft.id,
    sourceReportNumber: draft.reportNumber,
  }
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export default function DisasterWarningsSection({
  token,
  registeredDistrict,
  assignedDistricts,
  shelters = [],
  onActiveCountChange,
  reportDraft,
  onReportDraftConsumed,
}: DisasterWarningsSectionProps) {
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' }),
    [token],
  )

  const [districtsList, setDistrictsList] = useState<string[]>([])
  const allDistricts = useMemo(() => {
    const combined = new Set<string>(Object.keys(SRI_LANKA_DISTRICTS))
    if (registeredDistrict) combined.add(registeredDistrict)
    assignedDistricts?.forEach((d) => d && combined.add(d))
    districtsList.forEach((d) => d && combined.add(d))
    return Array.from(combined).sort((a, b) => a.localeCompare(b))
  }, [districtsList, registeredDistrict, assignedDistricts])

  const [alerts, setAlerts] = useState<HazardAlertItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('ALL')
  const [selectedSeverity, setSelectedSeverity] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  const [showCreateModal, setShowCreateModal] = useState(() => Boolean(reportDraft))
  const [form, setForm] = useState<AlertForm>(() =>
    buildForm(reportDraft, registeredDistrict),
  )
  const [formError, setFormError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [alertToCancel, setAlertToCancel] = useState<HazardAlertItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')

  const [alertForDeliveries, setAlertForDeliveries] = useState<HazardAlertItem | null>(null)
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([])
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false)

  const incident = useMemo<IncidentLocation | null>(() => {
    if (!reportDraft) return null
    const latitude = Number(reportDraft.latitude)
    const longitude = Number(reportDraft.longitude)
    if (
      reportDraft.latitude == null ||
      reportDraft.longitude == null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null
    }
    return {
      latitude,
      longitude,
      label: `Report ${reportDraft.reportNumber}`,
    }
  }, [reportDraft])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/reports/districts`, {
          headers: { Accept: 'application/json' },
        })
        const result = await res.json().catch(() => null)
        if (res.ok && Array.isArray(result?.data)) setDistrictsList(result.data)
      } catch {
        // The built-in district list is used when the backend list is unavailable.
      }
    })()
  }, [])

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/hazard-alerts/history`, { headers: authHeaders })
      const result = await res.json().catch(() => null)
      if (!res.ok) throw new Error(result?.message || 'Failed to load hazard alerts')
      const list: HazardAlertItem[] = Array.isArray(result?.data) ? result.data : []
      setAlerts(list)
      onActiveCountChange?.(list.filter((a) => a.status === 'PUBLISHED').length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load hazard alerts')
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders])

  useEffect(() => {
    void fetchAlerts()
  }, [fetchAlerts])

  const openDeliveries = async (alertItem: HazardAlertItem) => {
    setAlertForDeliveries(alertItem)
    setDeliveries([])
    setIsLoadingDeliveries(true)
    try {
      const res = await fetch(`${API_URL}/hazard-alerts/${alertItem._id}/deliveries`, {
        headers: authHeaders,
      })
      const result = await res.json().catch(() => null)
      if (res.ok && Array.isArray(result?.data?.records)) {
        setDeliveries(result.data.records)
      }
    } finally {
      setIsLoadingDeliveries(false)
    }
  }

  const openCreateModal = () => {
    onReportDraftConsumed?.()
    setForm(
      buildForm(
        null,
        selectedDistrict !== 'ALL' ? selectedDistrict : registeredDistrict,
      ),
    )
    setFormError('')
    setShowPreview(false)
    setNotice(null)
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setShowPreview(false)
    onReportDraftConsumed?.()
  }

  const updateForm = <K extends keyof AlertForm>(key: K, value: AlertForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const toggleDistrict = (district: string) =>
    setForm((current) => ({
      ...current,
      districts: current.districts.includes(district)
        ? current.districts.filter((d) => d !== district)
        : [...current.districts, district],
    }))

  const addCity = (city: string) => {
    const value = city.trim()
    if (!value) return
    setForm((current) =>
      current.cities.some((c) => c.toLowerCase() === value.toLowerCase())
        ? current
        : { ...current, cities: [...current.cities, value] },
    )
  }

  const toggleChannel = (channel: NotificationChannel) =>
    setForm((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((c) => c !== channel)
        : [...current.channels, channel],
    }))

  const citySuggestions = useMemo(
    () =>
      form.districts
        .flatMap((d) => SRI_LANKA_DISTRICTS[d]?.popularCities ?? [])
        .filter((c) => !form.cities.includes(c)),
    [form.districts, form.cities],
  )

  const validateForm = (): string => {
    if (!form.title.trim()) return 'Alert title is required.'
    if (!form.severity) return 'Select a severity level.'
    if (form.districts.length === 0) return 'Select at least one affected district.'
    if (!form.message.trim()) return 'Alert message is required.'
    if (!form.safetyInstructions.trim()) return 'Safety instructions are required.'
    if (form.channels.length === 0) return 'Select at least one notification method.'
    return ''
  }

  const handleReviewAlert = (e: FormEvent) => {
    e.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      return
    }
    setFormError('')
    setShowPreview(true)
  }

  const publishAlert = async () => {
    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      setShowPreview(false)
      return
    }

    try {
      setIsSubmitting(true)
      setFormError('')

      const res = await fetch(`${API_URL}/hazard-alerts`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          message: form.message.trim(),
          safetyInstructions: form.safetyInstructions.trim(),
          hazardType: form.hazardType,
          severity: form.severity,
          affectedDistricts: form.districts,
          affectedCities: form.cities.length > 0 ? form.cities : ['All Cities'],
          notificationChannels: form.channels,
          ...(form.sourceReportId ? { sourceReportId: form.sourceReportId } : {}),
        }),
      })
      const result = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(
          Array.isArray(result?.message)
            ? result.message.join(', ')
            : result?.message || 'Failed to publish hazard alert.',
        )
      }

      const dispatch = result?.data?.dispatch
      const failedAttempts = Number(dispatch?.failedAttempts || 0)
      const matched = Number(dispatch?.matchedCitizens || 0)
      const skipped = Number(dispatch?.skippedWithoutEnabledChannel || 0)
      const attempted =
        Number(dispatch?.smsAttempts || 0) +
        Number(dispatch?.pushAttempts || 0) +
        Number(dispatch?.whatsappAttempts || 0)

      if (dispatch?.dispatchError === true) {
        setNotice({
          tone: 'warning',
          text: 'Alert published, but notification delivery failed. Check the delivery report and retry.',
        })
      } else if (matched === 0) {
        setNotice({
          tone: 'warning',
          text: 'Alert published, but no registered citizens were found in the selected area, so nobody was notified.',
        })
      } else if (attempted === 0) {
        setNotice({
          tone: 'warning',
          text: `Alert published. ${matched} citizen(s) live in the area, but none could be reached through the selected channels (missing phone number or device).`,
        })
      } else if (failedAttempts > 0) {
        setNotice({
          tone: 'warning',
          text: `Alert published. ${failedAttempts} of ${attempted} notification(s) failed to deliver; see the delivery report.`,
        })
      } else {
        setNotice({
          tone: 'success',
          text: `Alert published. ${attempted} notification(s) sent to ${matched - skipped} citizen(s).`,
        })
      }
      closeCreateModal()
      void fetchAlerts()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error publishing alert')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelAlert = async () => {
    if (!alertToCancel) return
    if (!cancelReason.trim()) {
      setCancelError('Enter a cancellation reason.')
      return
    }
    try {
      setIsSubmitting(true)
      const res = await fetch(`${API_URL}/hazard-alerts/${alertToCancel._id}/cancel`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'Failed to cancel alert.')
      }
      setAlertToCancel(null)
      setCancelReason('')
      setCancelError('')
      void fetchAlerts()
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Error cancelling alert')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredAlerts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return alerts.filter((item) => {
      if (
        selectedDistrict !== 'ALL' &&
        !item.affectedDistricts.some((d) => d.toLowerCase() === selectedDistrict.toLowerCase())
      ) {
        return false
      }
      if (selectedSeverity !== 'ALL' && item.severity !== selectedSeverity) return false
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false
      if (!query) return true
      return [item.title, item.message, item.hazardType, ...item.affectedCities, ...item.affectedDistricts]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(query))
    })
  }, [alerts, selectedDistrict, selectedSeverity, selectedStatus, searchTerm])

  const activeCount = alerts.filter((a) => a.status === 'PUBLISHED').length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Warning Alerts</h2>
          <p className="text-sm text-slate-500">
            {activeCount} active alert{activeCount === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <Plus size={16} />
          Issue Alert
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${
            notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search alerts"
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-red-500"
          />
        </div>
        <DropdownSelect
          ariaLabel="Filter by district"
          value={selectedDistrict}
          onChange={setSelectedDistrict}
          className="w-44"
          options={[
            { value: 'ALL', label: 'All districts' },
            ...allDistricts.map((d) => ({ value: d, label: d })),
          ]}
        />
        <DropdownSelect
          ariaLabel="Filter by severity"
          value={selectedSeverity}
          onChange={setSelectedSeverity}
          className="w-40"
          options={[
            { value: 'ALL', label: 'All severities' },
            ...SEVERITY_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
          ]}
        />
        <DropdownSelect
          ariaLabel="Filter by status"
          value={selectedStatus}
          onChange={setSelectedStatus}
          className="w-36"
          options={[
            { value: 'ALL', label: 'All statuses' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
        />
        <button
          type="button"
          onClick={() => void fetchAlerts()}
          disabled={isLoading}
          title="Refresh"
          className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-3">
        {isLoading && alerts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Loading alerts…
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
            <Megaphone size={28} className="mx-auto text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-800">No alerts found</p>
            <p className="text-xs text-slate-500">Adjust the filters or issue a new alert.</p>
          </div>
        ) : (
          filteredAlerts.map((item) => {
            const severity = SEVERITY_OPTIONS.find((s) => s.value === item.severity)
            const cancelled = item.status === 'CANCELLED'
            return (
              <article
                key={item._id}
                className={`rounded-lg border bg-white p-4 ${
                  cancelled ? 'border-slate-200 opacity-75' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-semibold ${
                          cancelled ? 'bg-slate-200 text-slate-600' : severity?.badge
                        }`}
                      >
                        {cancelled ? 'Cancelled' : severity?.label ?? item.severity}
                      </span>
                      <span className="text-slate-500">{labelOf(item.hazardType)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">{formatDate(item.publishedAt || item.createdAt)}</span>
                      {item.sourceReportNumber && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">
                          {item.sourceReportNumber}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{item.message}</p>
                    <p className="mt-2 text-sm text-slate-700">
                      <span className="font-medium">Safety: </span>
                      {item.safetyInstructions}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                      <MapPin size={13} className="text-slate-400" />
                      {item.affectedDistricts.map((d) => (
                        <span key={d} className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          {d}
                        </span>
                      ))}
                      {item.affectedCities.map((c) => (
                        <span key={c} className="rounded border border-slate-200 px-2 py-0.5 text-slate-600">
                          {c}
                        </span>
                      ))}
                    </div>
                    {cancelled && item.cancellationReason && (
                      <p className="mt-3 rounded bg-slate-50 p-2 text-xs text-slate-600">
                        Cancelled: {item.cancellationReason}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void openDeliveries(item)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Deliveries
                    </button>
                    {!cancelled && (
                      <button
                        type="button"
                        onClick={() => {
                          setAlertToCancel(item)
                          setCancelReason('')
                          setCancelError('')
                        }}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Issue Location-Specific Alert</h3>
                {form.sourceReportNumber ? (
                  <p className="text-xs text-emerald-700">
                    Based on verified report {form.sourceReportNumber}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Choose the affected area on the map, then publish.</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeCreateModal}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleReviewAlert}
              className={showPreview ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}
            >
              <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLASS} htmlFor="alert-title">
                      Title
                    </label>
                    <input
                      id="alert-title"
                      value={form.title}
                      onChange={(e) => updateForm('title', e.target.value)}
                      placeholder="e.g. Flood warning – Kelani river basin"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <span className={LABEL_CLASS} id="alert-hazard-label">
                      Hazard type
                    </span>
                    <DropdownSelect
                      ariaLabel="Hazard type"
                      value={form.hazardType}
                      onChange={(value) => updateForm('hazardType', value)}
                      className="mt-1"
                      options={HAZARD_OPTIONS.map(([value, label]) => ({ value, label }))}
                    />
                  </div>

                  <fieldset>
                    <legend className={LABEL_CLASS}>Severity</legend>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {SEVERITY_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`cursor-pointer rounded-md border px-3 py-2 ${
                            form.severity === option.value
                              ? option.selected
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="severity"
                            value={option.value}
                            checked={form.severity === option.value}
                            onChange={() => updateForm('severity', option.value)}
                            className="sr-only"
                          />
                          <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                          <span className="block text-[11px] text-slate-500">{option.hint}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label className={LABEL_CLASS} htmlFor="alert-message">
                      Alert message
                    </label>
                    <textarea
                      id="alert-message"
                      rows={3}
                      value={form.message}
                      onChange={(e) => updateForm('message', e.target.value)}
                      placeholder="Describe the hazard and current situation"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label className={LABEL_CLASS} htmlFor="alert-safety">
                      Safety instructions
                    </label>
                    <textarea
                      id="alert-safety"
                      rows={2}
                      value={form.safetyInstructions}
                      onChange={(e) => updateForm('safetyInstructions', e.target.value)}
                      placeholder="e.g. Move to the nearest shelter and avoid flooded roads"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <fieldset>
                    <legend className={LABEL_CLASS}>Notify citizens by</legend>
                    <div className="mt-1 flex gap-2">
                      {CHANNEL_OPTIONS.map(([value, label]) => (
                        <label
                          key={value}
                          className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                            form.channels.includes(value)
                              ? 'border-red-500 bg-red-50 text-red-800'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={form.channels.includes(value)}
                            onChange={() => toggleChannel(value)}
                            className="accent-red-600"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={LABEL_CLASS}>Affected area</span>
                    <span className="text-xs text-slate-500">Click a district on the map to add or remove it</span>
                  </div>

                  <AffectedAreaMap
                    selectedDistricts={form.districts}
                    onToggleDistrict={toggleDistrict}
                    onAddCity={addCity}
                    shelters={shelters}
                    incident={incident}
                    height={340}
                  />

                  <div>
                    <span className={LABEL_CLASS}>Districts ({form.districts.length})</span>
                    <DropdownSelect
                      ariaLabel="Add a district"
                      value=""
                      placeholder="Add a district…"
                      onChange={toggleDistrict}
                      className="mt-1"
                      options={allDistricts
                        .filter((d) => !form.districts.includes(d))
                        .map((d) => ({ value: d, label: d }))}
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.districts.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDistrict(d)}
                          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          {d}
                          <X size={12} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={LABEL_CLASS} htmlFor="alert-city-add">
                      Cities / areas{' '}
                      <span className="font-normal text-slate-500">
                        (optional – only citizens living in these cities are notified; leave empty to notify the whole district)
                      </span>
                    </label>
                    <input
                      id="alert-city-add"
                      placeholder="Type a city and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCity(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                      className={INPUT_CLASS}
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.cities.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            updateForm(
                              'cities',
                              form.cities.filter((city) => city !== c),
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          {c}
                          <X size={12} />
                        </button>
                      ))}
                    </div>
                    {citySuggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {citySuggestions.slice(0, 12).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => addCity(c)}
                            className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:border-red-400 hover:text-red-700"
                          >
                            + {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">
                <p role="alert" className="min-h-5 text-sm font-medium text-red-700">
                  {formError}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Review alert
                  </button>
                </div>
              </div>
            </form>

            {showPreview && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Review the alert below. Once published, it is saved, shown to citizens and sent
                    immediately through the selected channels.
                  </div>

                  <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-semibold ${
                          SEVERITY_OPTIONS.find((s) => s.value === form.severity)?.badge ?? ''
                        }`}
                      >
                        {SEVERITY_OPTIONS.find((s) => s.value === form.severity)?.label}
                      </span>
                      <span className="text-slate-500">{labelOf(form.hazardType)}</span>
                      {form.sourceReportNumber && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">
                          {form.sourceReportNumber}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-2 text-lg font-semibold text-slate-900">{form.title.trim()}</h4>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                      {form.message.trim()}
                    </p>
                    <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-800">
                      <span className="font-semibold">Safety instructions: </span>
                      {form.safetyInstructions.trim()}
                    </p>
                  </article>

                  <dl className="grid gap-4 text-sm sm:grid-cols-3">
                    <div className="rounded-md border border-slate-200 p-3">
                      <dt className="text-xs font-semibold uppercase text-slate-400">Districts</dt>
                      <dd className="mt-1 text-slate-800">{form.districts.join(', ')}</dd>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3">
                      <dt className="text-xs font-semibold uppercase text-slate-400">Cities / areas</dt>
                      <dd className="mt-1 text-slate-800">
                        {form.cities.length > 0
                          ? form.cities.join(', ')
                          : 'Whole district (all cities)'}
                      </dd>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3">
                      <dt className="text-xs font-semibold uppercase text-slate-400">Notified by</dt>
                      <dd className="mt-1 text-slate-800">
                        {form.channels
                          .map((c) => CHANNEL_OPTIONS.find(([value]) => value === c)?.[1] ?? c)
                          .join(', ')}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">
                  <p role="alert" className="min-h-5 text-sm font-medium text-red-700">
                    {formError}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      disabled={isSubmitting}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Back to edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void publishAlert()}
                      disabled={isSubmitting}
                      className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Publishing…' : 'Confirm & Publish'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {alertForDeliveries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="font-bold text-slate-900">Delivery report</h3>
                <p className="text-xs text-slate-500">{alertForDeliveries.title}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setAlertForDeliveries(null)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                {[
                  ['Total', deliveries.length],
                  [
                    'Sent',
                    deliveries.filter((d) => d.status === 'SENT' || d.status === 'DELIVERED').length,
                  ],
                  ['Failed', deliveries.filter((d) => d.status === 'FAILED').length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-slate-200 p-3">
                    <p className="text-xl font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              {isLoadingDeliveries ? (
                <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
              ) : deliveries.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No deliveries recorded.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Channel</th>
                      <th className="py-2 pr-3">Recipient</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Time</th>
                      <th className="py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deliveries.map((d) => (
                      <tr key={d._id}>
                        <td className="py-2 pr-3">
                          {d.channel === 'SMS' ? 'SMS' : d.channel === 'PUSH' ? 'Push' : 'WhatsApp'}
                        </td>
                        <td className="py-2 pr-3 font-mono text-slate-600">{d.recipientId}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              d.status === 'FAILED' ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {d.status !== 'FAILED' && <CheckCircle2 size={12} />}
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-slate-500">{formatDate(d.sentAt || d.createdAt)}</td>
                        <td className="py-2 text-slate-500">{d.failureReason || d.providerMessageId || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {alertToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-slate-900">Cancel alert</h3>
            <p className="mt-1 text-xs text-slate-500">{alertToCancel.title}</p>
            <label className={`${LABEL_CLASS} mt-4`} htmlFor="cancel-reason">
              Reason
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Water levels have dropped below the alert threshold"
              className={INPUT_CLASS}
            />
            {cancelError && <p className="mt-2 text-sm text-red-700">{cancelError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAlertToCancel(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep alert
              </button>
              <button
                type="button"
                onClick={() => void handleCancelAlert()}
                disabled={isSubmitting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
