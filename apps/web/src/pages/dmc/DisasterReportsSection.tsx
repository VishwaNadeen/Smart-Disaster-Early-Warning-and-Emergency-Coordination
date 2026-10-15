import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Megaphone, Plus, RefreshCw, Search, X } from 'lucide-react'
import CreateIncidentModal from './CreateIncidentModal'
import DropdownSelect from './DropdownSelect'
import { SRI_LANKA_DISTRICTS } from './sriLankaDistricts'

const API_URL = 'http://localhost:3000/api'
const FILE_BASE_URL = 'http://localhost:3000'

export interface DisasterReportItem {
  _id: string
  id?: string
  reportNumber: string
  citizenId: string
  citizenName?: string
  citizenPhone?: string
  citizenEmail?: string
  hazardType: string
  customHazardType?: string
  description?: string
  photoUrl?: string
  latitude?: number
  longitude?: number
  district?: string
  city?: string
  manualLocation?: string
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'NEEDS_MORE_INFO' | 'REJECTED' | 'DRAFT' | 'PENDING_SYNC'
  possibleDuplicate?: boolean
  rejectionReason?: string
  officerNotes?: string
  submittedAt?: string
  createdAt?: string
}

interface DisasterReportsSectionProps {
  token: string
  registeredDistrict?: string
  assignedDistricts?: string[]
  role?: string
  onPendingCountChange?: (count: number) => void
  onIssueAlertFromReport?: (report: DisasterReportItem) => void
}

type ReviewDecision = 'VERIFIED' | 'NEEDS_MORE_INFO' | 'REJECTED'

const HAZARD_LABELS: Record<string, string> = {
  FLOOD: 'Flood',
  RISING_WATER: 'Rising water',
  LANDSLIDE: 'Landslide',
  LANDSLIDE_CRACK: 'Landslide crack',
  BLOCKED_ROAD: 'Blocked road',
  STRONG_WIND: 'Strong wind',
  FIRE: 'Fire',
  EARTHQUAKE: 'Earthquake',
  OTHER: 'Other',
}

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  PENDING_VERIFICATION: { label: 'Pending', badge: 'bg-amber-100 text-amber-800' },
  VERIFIED: { label: 'Verified', badge: 'bg-emerald-100 text-emerald-800' },
  NEEDS_MORE_INFO: { label: 'Needs info', badge: 'bg-sky-100 text-sky-800' },
  REJECTED: { label: 'Rejected', badge: 'bg-rose-100 text-rose-800' },
  DRAFT: { label: 'Draft', badge: 'bg-slate-100 text-slate-600' },
  PENDING_SYNC: { label: 'Pending sync', badge: 'bg-slate-100 text-slate-600' },
}

const STATUS_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING_VERIFICATION', label: 'Pending' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'NEEDS_MORE_INFO', label: 'Needs info' },
  { id: 'REJECTED', label: 'Rejected' },
]

const DECISIONS: { value: ReviewDecision; label: string; selected: string }[] = [
  { value: 'VERIFIED', label: 'Verify', selected: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
  { value: 'NEEDS_MORE_INFO', label: 'Needs more info', selected: 'border-sky-500 bg-sky-50 text-sky-800' },
  { value: 'REJECTED', label: 'Reject', selected: 'border-rose-500 bg-rose-50 text-rose-800' },
]

const incidentIcon = L.divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#dc2626;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const photoSrc = (url: string) => (url.startsWith('http') ? url : `${FILE_BASE_URL}${url}`)
const reportKey = (report: DisasterReportItem) => report._id || report.id || report.reportNumber
const hazardLabel = (report: DisasterReportItem) =>
  report.hazardType === 'OTHER' && report.customHazardType
    ? report.customHazardType
    : HAZARD_LABELS[report.hazardType] || report.hazardType

function locationText(report: DisasterReportItem) {
  return [report.manualLocation, report.city, report.district].filter(Boolean).join(', ') || 'Location not provided'
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function getCoordinates(report: DisasterReportItem): [number, number] | null {
  if (report.latitude == null || report.longitude == null) return null
  const latitude = Number(report.latitude)
  const longitude = Number(report.longitude)
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null
}

export default function DisasterReportsSection({
  token,
  registeredDistrict,
  assignedDistricts,
  onPendingCountChange,
  onIssueAlertFromReport,
}: DisasterReportsSectionProps) {
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

  const [selectedDistrict, setSelectedDistrict] = useState(registeredDistrict || 'ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [selectedHazard, setSelectedHazard] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const [reports, setReports] = useState<DisasterReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [activeReport, setActiveReport] = useState<DisasterReportItem | null>(null)
  const [decision, setDecision] = useState<ReviewDecision>('VERIFIED')
  const [notes, setNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewNotice, setReviewNotice] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/reports/districts`, { headers: authHeaders })
        const result = await res.json().catch(() => null)
        if (res.ok && Array.isArray(result?.data)) setDistrictsList(result.data)
      } catch {
        // The built-in district list is used when the backend list is unavailable.
      }
    })()
  }, [authHeaders])

  const fetchReports = useCallback(
    async (district: string) => {
      setIsLoading(true)
      setError('')
      try {
        const url = new URL(`${API_URL}/reports`)
        if (district !== 'ALL') url.searchParams.set('district', district)
        const res = await fetch(url.toString(), { headers: authHeaders })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.message || `Failed to load reports (HTTP ${res.status})`)
        const list: DisasterReportItem[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : []
        setReports(list)
        onPendingCountChange?.(list.filter((r) => r.status === 'PENDING_VERIFICATION').length)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load disaster reports.')
      } finally {
        setIsLoading(false)
      }
    },
    [authHeaders, onPendingCountChange],
  )

  useEffect(() => {
    void fetchReports(selectedDistrict)
    const timer = window.setInterval(() => void fetchReports(selectedDistrict), 15000)
    return () => window.clearInterval(timer)
  }, [fetchReports, selectedDistrict])

  const openReview = (report: DisasterReportItem) => {
    setActiveReport(report)
    setDecision(report.status === 'REJECTED' || report.status === 'NEEDS_MORE_INFO' ? report.status : 'VERIFIED')
    setNotes(report.officerNotes || '')
    setRejectionReason(report.rejectionReason || '')
    setReviewError('')
    setReviewNotice('')
  }

  const saveDecision = async (report: DisasterReportItem, status: ReviewDecision) => {
    const res = await fetch(`${API_URL}/reports/${reportKey(report)}/status`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        officerNotes: notes.trim() || undefined,
        rejectionReason: status === 'REJECTED' ? rejectionReason.trim() : undefined,
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.message || 'Could not update verification status')
  }

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeReport || activeReport.status !== 'PENDING_VERIFICATION') return
    if (decision === 'REJECTED' && !rejectionReason.trim()) {
      setReviewError('Enter a rejection reason.')
      return
    }

    try {
      setIsSaving(true)
      setReviewError('')
      await saveDecision(activeReport, decision)
      const updated: DisasterReportItem = {
        ...activeReport,
        status: decision,
        officerNotes: notes.trim() || undefined,
        rejectionReason: decision === 'REJECTED' ? rejectionReason.trim() : undefined,
      }
      setActiveReport(updated)
      setReviewNotice(
        decision === 'VERIFIED'
          ? 'Report verified. You can now issue an alert for this area.'
          : 'Decision saved.',
      )
      void fetchReports(selectedDistrict)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Error updating status')
    } finally {
      setIsSaving(false)
    }
  }

  const issueAlert = (report: DisasterReportItem) => {
    setActiveReport(null)
    onIssueAlertFromReport?.(report)
  }

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return reports.filter((item) => {
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false
      if (selectedHazard !== 'ALL' && item.hazardType !== selectedHazard) return false
      if (!query) return true
      return [
        item.reportNumber,
        item.hazardType,
        item.customHazardType,
        item.description,
        item.city,
        item.district,
        item.manualLocation,
        item.citizenName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [reports, selectedStatus, selectedHazard, searchTerm])

  const countFor = (status: string) =>
    status === 'ALL' ? reports.length : reports.filter((r) => r.status === status).length

  const activeCoordinates = activeReport ? getCoordinates(activeReport) : null
  const isPending = activeReport?.status === 'PENDING_VERIFICATION'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Disaster Reports</h2>
          <p className="text-sm text-slate-500">
            {countFor('PENDING_VERIFICATION')} pending verification
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus size={16} />
          Log Incident
        </button>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                selectedStatus === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label} <span className="opacity-70">{countFor(tab.id)}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by report number, location or citizen"
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <DropdownSelect
            ariaLabel="Filter by district"
            value={selectedDistrict}
            onChange={setSelectedDistrict}
            className="w-44"
            buttonClassName="focus:border-teal-500 focus:ring-teal-500"
            options={[
              { value: 'ALL', label: 'All districts' },
              ...allDistricts.map((d) => ({ value: d, label: d })),
            ]}
          />
          <DropdownSelect
            ariaLabel="Filter by hazard"
            value={selectedHazard}
            onChange={setSelectedHazard}
            className="w-44"
            buttonClassName="focus:border-teal-500 focus:ring-teal-500"
            options={[
              { value: 'ALL', label: 'All hazards' },
              ...Object.entries(HAZARD_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <button
            type="button"
            title="Refresh"
            onClick={() => void fetchReports(selectedDistrict)}
            disabled={isLoading}
            className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {isLoading && reports.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">Loading reports…</p>
        ) : filteredReports.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No reports match the current filters.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredReports.map((report) => {
              const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.DRAFT
              return (
                <li
                  key={reportKey(report)}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {report.reportNumber}
                      </span>
                      <span className="font-medium text-slate-800">{hazardLabel(report)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.badge}`}>
                        {status.label}
                      </span>
                      {report.possibleDuplicate && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                          Possible duplicate
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">{locationText(report)}</p>
                    <p className="text-xs text-slate-400">
                      {report.citizenName || 'Citizen'} · {formatDate(report.submittedAt || report.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {report.status === 'VERIFIED' && onIssueAlertFromReport && (
                      <button
                        type="button"
                        onClick={() => onIssueAlertFromReport(report)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        <Megaphone size={13} />
                        Issue Alert
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openReview(report)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {report.status === 'PENDING_VERIFICATION' ? 'Review' : 'View'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">Report {activeReport.reportNumber}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      (STATUS_CONFIG[activeReport.status] ?? STATUS_CONFIG.DRAFT).badge
                    }`}
                  >
                    {(STATUS_CONFIG[activeReport.status] ?? STATUS_CONFIG.DRAFT).label}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {hazardLabel(activeReport)} · {formatDate(activeReport.submittedAt || activeReport.createdAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setActiveReport(null)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Location</p>
                  <p className="mt-0.5 text-slate-800">{locationText(activeReport)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Description</p>
                  <p className="mt-0.5 whitespace-pre-line text-slate-800">
                    {activeReport.description || 'No description provided.'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Reported by</p>
                  <p className="mt-0.5 text-slate-800">
                    {[activeReport.citizenName, activeReport.citizenPhone, activeReport.citizenEmail]
                      .filter(Boolean)
                      .join(' · ') || 'Citizen'}
                  </p>
                </div>
                {activeReport.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewImage(activeReport.photoUrl || null)}
                    className="block overflow-hidden rounded-md border border-slate-200"
                  >
                    <img
                      src={photoSrc(activeReport.photoUrl)}
                      alt={`Report ${activeReport.reportNumber}`}
                      className="max-h-48 w-full object-cover"
                    />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {activeCoordinates ? (
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="h-56">
                      <MapContainer
                        key={reportKey(activeReport)}
                        center={activeCoordinates}
                        zoom={13}
                        scrollWheelZoom={false}
                        className="h-full w-full"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={activeCoordinates} icon={incidentIcon} />
                      </MapContainer>
                    </div>
                    <p className="border-t border-slate-200 px-3 py-1.5 text-xs text-slate-500">
                      {activeCoordinates[0].toFixed(5)}, {activeCoordinates[1].toFixed(5)}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                    This report has no GPS coordinates.
                  </p>
                )}

                <form onSubmit={handleSubmitReview} className="space-y-3">
                  {isPending ? (
                    <div className="grid grid-cols-3 gap-2">
                      {DECISIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDecision(option.value)}
                          className={`rounded-md border px-2 py-2 text-xs font-semibold ${
                            decision === option.value
                              ? option.selected
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700" htmlFor="officer-notes">
                      Officer notes
                    </label>
                    <textarea
                      id="officer-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={!isPending}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50"
                    />
                  </div>

                  {isPending && decision === 'REJECTED' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700" htmlFor="rejection-reason">
                        Rejection reason
                      </label>
                      <input
                        id="rejection-reason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500"
                      />
                    </div>
                  )}

                  {!isPending && activeReport.rejectionReason && (
                    <p className="text-sm text-rose-700">Rejected: {activeReport.rejectionReason}</p>
                  )}
                  {reviewError && <p className="text-sm font-medium text-red-700">{reviewError}</p>}
                  {reviewNotice && <p className="text-sm font-medium text-emerald-700">{reviewNotice}</p>}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveReport(null)}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                    {isPending && (
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving…' : 'Save decision'}
                      </button>
                    )}
                    {activeReport.status === 'VERIFIED' && onIssueAlertFromReport && (
                      <button
                        type="button"
                        onClick={() => issueAlert(activeReport)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        <Megaphone size={14} />
                        Issue Alert
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={photoSrc(previewImage)}
            alt="Report preview"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showCreateModal && (
        <CreateIncidentModal
          token={token}
          districts={allDistricts}
          defaultDistrict={
            selectedDistrict !== 'ALL' ? selectedDistrict : registeredDistrict || allDistricts[0] || 'Colombo'
          }
          onCreated={() => {
            setShowCreateModal(false)
            void fetchReports(selectedDistrict)
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
