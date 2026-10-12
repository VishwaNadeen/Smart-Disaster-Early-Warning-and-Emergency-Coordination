import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Flame,
  Globe,
  Info,
  MapPin,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Waves,
  Wind,
  X,
  XCircle,
} from 'lucide-react'

const API_URL = 'http://localhost:3000/api'

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
}

const HAZARD_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  FLOOD: { label: 'Flood', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  RISING_WATER: { label: 'Rising Water', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
  LANDSLIDE: { label: 'Landslide', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  LANDSLIDE_CRACK: { label: 'Landslide Crack', color: 'text-orange-800', bg: 'bg-orange-50', border: 'border-orange-200' },
  BLOCKED_ROAD: { label: 'Blocked Road', color: 'text-yellow-800', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  STRONG_WIND: { label: 'Strong Wind', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  FIRE: { label: 'Fire', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  EARTHQUAKE: { label: 'Earthquake', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  OTHER: { label: 'Other Hazard', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
  },
  VERIFIED: {
    label: 'Verified',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  NEEDS_MORE_INFO: {
    label: 'Needs More Info',
    color: 'text-sky-700',
    bg: 'bg-sky-50 border-sky-200',
    dot: 'bg-sky-500',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
    dot: 'bg-rose-500',
  },
  DRAFT: {
    label: 'Draft',
    color: 'text-slate-600',
    bg: 'bg-slate-100 border-slate-200',
    dot: 'bg-slate-400',
  },
}

export default function DisasterReportsSection({
  token,
  registeredDistrict,
  assignedDistricts,
  onPendingCountChange,
}: DisasterReportsSectionProps) {
  // Districts dynamically fetched from backend API
  const [districtsList, setDistrictsList] = useState<string[]>([])
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false)

  // Combined dynamic districts list (Islandwide districts from backend + any officer assignments)
  const allDistricts = useMemo(() => {
    const combined = new Set<string>()
    if (registeredDistrict) combined.add(registeredDistrict)
    if (assignedDistricts) {
      assignedDistricts.forEach((d) => d && combined.add(d))
    }
    districtsList.forEach((d) => d && combined.add(d))
    return Array.from(combined).sort((a, b) => a.localeCompare(b))
  }, [districtsList, registeredDistrict, assignedDistricts])

  // Active district being viewed (can be 'ALL' for islandwide, or a specific district)
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    registeredDistrict || 'ALL',
  )

  // Reports state from backend
  const [reports, setReports] = useState<DisasterReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedHazard, setSelectedHazard] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  // Modals state
  const [activeReport, setActiveReport] = useState<DisasterReportItem | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [verificationNotes, setVerificationNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<
    'VERIFIED' | 'REJECTED' | 'NEEDS_MORE_INFO'
  >('VERIFIED')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // 1. Fetch districts list dynamically from backend
  const fetchDistrictsFromBackend = useCallback(async () => {
    setIsLoadingDistricts(true)
    try {
      const res = await fetch(`${API_URL}/reports/districts`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const result = await res.json().catch(() => null)
      if (res.ok && Array.isArray(result?.data)) {
        setDistrictsList(result.data)
      }
    } catch {
      // Backend districts call fallback
    } finally {
      setIsLoadingDistricts(false)
    }
  }, [token])

  useEffect(() => {
    void fetchDistrictsFromBackend()
  }, [fetchDistrictsFromBackend])

  // 2. Fetch reports dynamically from backend API (no hardcoded data)
  const fetchReports = useCallback(
    async (district: string) => {
      setIsLoading(true)
      setError('')

      try {
        const url = new URL(`${API_URL}/reports`)
        // If a specific district is selected (not 'ALL'), pass it to the backend
        if (district && district !== 'ALL') {
          url.searchParams.set('district', district)
        }

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        const data = await res.json().catch(() => null)

        if (!res.ok) {
          throw new Error(
            data?.message || `Failed to load reports from backend (HTTP ${res.status})`,
          )
        }

        const list: DisasterReportItem[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : []

        setReports(list)

        // Notify parent about pending count
        const pendingCount = list.filter(
          (r) => r.status === 'PENDING_VERIFICATION',
        ).length
        if (onPendingCountChange) {
          onPendingCountChange(pendingCount)
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not fetch disaster reports from backend API.',
        )
      } finally {
        setIsLoading(false)
      }
    },
    [token, onPendingCountChange],
  )

  useEffect(() => {
    void fetchReports(selectedDistrict)
  }, [fetchReports, selectedDistrict])

  // Handle Quick Verify directly from row
  async function handleQuickVerify(report: DisasterReportItem) {
    const reportId = report._id || report.id
    if (!reportId) return

    try {
      setIsUpdatingStatus(true)
      const res = await fetch(`${API_URL}/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'VERIFIED',
          officerNotes: `Verified by Duty Officer on ${new Date().toLocaleDateString()}`,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.message || 'Verification failed')
      }

      // Re-fetch reports from backend to ensure real database state
      void fetchReports(selectedDistrict)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to verify report')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle Full Verification Submission in Modal
  async function handleSubmitVerification(e: FormEvent) {
    e.preventDefault()
    if (!activeReport) return

    const reportId = activeReport._id || activeReport.id
    if (!reportId) return

    try {
      setIsUpdatingStatus(true)
      const res = await fetch(`${API_URL}/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: selectedVerificationStatus,
          officerNotes: verificationNotes.trim() || undefined,
          rejectionReason:
            selectedVerificationStatus === 'REJECTED'
              ? rejectionReason.trim() || 'Declined upon verification'
              : undefined,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.message || 'Could not update verification status')
      }

      setActiveReport(null)
      setVerificationNotes('')
      setRejectionReason('')

      // Re-fetch reports from backend
      void fetchReports(selectedDistrict)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Open verification modal for a report
  function openReportModal(report: DisasterReportItem) {
    setActiveReport(report)
    setSelectedVerificationStatus(
      report.status === 'VERIFIED'
        ? 'VERIFIED'
        : report.status === 'REJECTED'
          ? 'REJECTED'
          : 'VERIFIED',
    )
    setVerificationNotes(report.officerNotes || '')
    setRejectionReason(report.rejectionReason || '')
  }

  // Filtered reports in memory by status, hazard, and search query
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false
      }

      if (selectedHazard !== 'ALL' && item.hazardType !== selectedHazard) {
        return false
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const match = [
          item.reportNumber,
          item.hazardType,
          item.customHazardType,
          item.description,
          item.city,
          item.district,
          item.manualLocation,
          item.citizenName,
          item.citizenPhone,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(query))

        if (!match) return false
      }

      return true
    })
  }, [reports, selectedStatus, selectedHazard, searchTerm])

  // Real backend metrics
  const totalReports = reports.length
  const pendingReports = reports.filter((r) => r.status === 'PENDING_VERIFICATION').length
  const verifiedReports = reports.filter((r) => r.status === 'VERIFIED').length
  const criticalHazards = reports.filter((r) =>
    ['FLOOD', 'RISING_WATER', 'LANDSLIDE', 'FIRE'].includes(r.hazardType),
  ).length

  return (
    <div className="space-y-6">
      {/* Scope Banner: District Switcher with "All Districts" */}
      <div className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50/40 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="rounded-lg bg-teal-600 p-2 text-white shadow-xs">
              {selectedDistrict === 'ALL' ? <Globe size={22} /> : <ShieldCheck size={22} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900">
                  {selectedDistrict === 'ALL' ? (
                    <span>
                      Active Scope: <span className="text-teal-700">All Districts (Islandwide)</span>
                    </span>
                  ) : (
                    <span>
                      Active Scope: <span className="text-teal-700">{selectedDistrict} District</span>
                    </span>
                  )}
                </h3>
                {selectedDistrict === registeredDistrict && registeredDistrict && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                    <Shield size={12} />
                    Registered Duty District
                  </span>
                )}
                {selectedDistrict === 'ALL' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    <Globe size={12} />
                    National DMC Operations
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                {selectedDistrict === 'ALL'
                  ? 'Displaying all live disaster reports across all administrative districts in Sri Lanka.'
                  : `Filtered to disaster incident reports submitted for ${selectedDistrict} District.`}
              </p>
            </div>
          </div>

          {/* District Switcher: Includes "All Districts" + All backend districts */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDistrict('ALL')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                selectedDistrict === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              All Districts
            </button>
            {registeredDistrict && (
              <button
                type="button"
                onClick={() => setSelectedDistrict(registeredDistrict)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  selectedDistrict === registeredDistrict
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                ★ {registeredDistrict}
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Switch District:
              </span>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={isLoadingDistricts && allDistricts.length === 0}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                <option value="ALL">All Districts (Islandwide)</option>
                {allDistricts.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist} District {dist === registeredDistrict ? '★ (Registered)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats (dynamically calculated from backend data) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {selectedDistrict === 'ALL' ? 'Islandwide Reports' : `${selectedDistrict} Total`}
              </p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {isLoading ? '…' : totalReports}
              </p>
            </div>
            <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
              <FileText size={20} />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {selectedDistrict === 'ALL'
              ? 'Total incidents recorded islandwide'
              : `Total incidents recorded in ${selectedDistrict}`}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
                Pending Verification
              </p>
              <p className="mt-2 text-3xl font-extrabold text-amber-900">
                {isLoading ? '…' : pendingReports}
              </p>
            </div>
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700">
              <Clock size={20} />
            </div>
          </div>
          <p className="mt-3 text-xs text-amber-800 font-medium">
            {pendingReports > 0 ? `${pendingReports} report(s) await officer review` : 'All reports verified'}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                Verified Incidents
              </p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-900">
                {isLoading ? '…' : verifiedReports}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="mt-3 text-xs text-emerald-700">
            Actionable disaster incidents verified
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50/40 to-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-red-700">
                Critical Hazards
              </p>
              <p className="mt-2 text-3xl font-extrabold text-red-900">
                {isLoading ? '…' : criticalHazards}
              </p>
            </div>
            <div className="rounded-lg bg-red-100 p-2.5 text-red-700">
              <ShieldAlert size={20} />
            </div>
          </div>
          <p className="mt-3 text-xs text-red-700">
            Floods, Landslides & Fires
          </p>
        </div>
      </div>

      {/* Control Bar: Filters, Search & Actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Status Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-2 sm:border-0 sm:pb-0">
              {[
                { id: 'ALL', label: 'All Status' },
                { id: 'PENDING_VERIFICATION', label: `Pending (${pendingReports})` },
                { id: 'VERIFIED', label: 'Verified' },
                { id: 'NEEDS_MORE_INFO', label: 'Needs Info' },
                { id: 'REJECTED', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    selectedStatus === tab.id
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchReports(selectedDistrict)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                title="Refresh list from backend"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition"
              >
                <Plus size={15} />
                Log Incident Report
              </button>
            </div>
          </div>

          {/* Search and Hazard Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  selectedDistrict === 'ALL'
                    ? 'Search all reports by #, hazard, location or citizen...'
                    : `Search ${selectedDistrict} reports by #, hazard, location or citizen...`
                }
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="w-full sm:w-48">
              <select
                value={selectedHazard}
                onChange={(e) => setSelectedHazard(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs font-medium text-slate-700 outline-none focus:border-teal-500"
              >
                <option value="ALL">All Hazard Types</option>
                <option value="FLOOD">Flood</option>
                <option value="RISING_WATER">Rising Water</option>
                <option value="LANDSLIDE">Landslide</option>
                <option value="LANDSLIDE_CRACK">Landslide Crack</option>
                <option value="BLOCKED_ROAD">Blocked Road</option>
                <option value="STRONG_WIND">Strong Wind</option>
                <option value="FIRE">Fire</option>
                <option value="EARTHQUAKE">Earthquake</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Unable to load reports from backend</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      )}

      {/* Reports Data View: Direct from backend */}
      {isLoading && reports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <RefreshCw size={28} className="mx-auto animate-spin text-teal-600" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            {selectedDistrict === 'ALL'
              ? 'Fetching islandwide disaster reports from backend database...'
              : `Fetching reports for ${selectedDistrict} District from backend database...`}
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ShieldAlert size={36} className="mx-auto text-slate-400" />
          <h4 className="mt-3 text-base font-bold text-slate-800">
            {selectedDistrict === 'ALL'
              ? 'No Disaster Reports Found in Database'
              : `No Disaster Reports Found for ${selectedDistrict} District`}
          </h4>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            {searchTerm || selectedHazard !== 'ALL' || selectedStatus !== 'ALL'
              ? 'No records match your active search filters. Try resetting the filters.'
              : 'There are currently no disaster reports stored in the backend database for this selection.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {(searchTerm || selectedHazard !== 'ALL' || selectedStatus !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('ALL')
                  setSelectedHazard('ALL')
                  setSearchTerm('')
                }}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-700 shadow-xs"
            >
              Log Incident Report
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
            Showing {filteredReports.length} report(s){' '}
            {selectedDistrict === 'ALL' ? 'across all districts' : `in ${selectedDistrict} District`}
          </div>

          <div className="divide-y divide-slate-100">
            {filteredReports.map((report) => {
              const hazard = HAZARD_LABELS[report.hazardType] || HAZARD_LABELS.OTHER
              const status = STATUS_CONFIG[report.status] || STATUS_CONFIG.DRAFT
              const reportId = report._id || report.id

              return (
                <div
                  key={reportId}
                  className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-start gap-4">
                    {/* Photo thumbnail or Hazard Icon */}
                    {report.photoUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(report.photoUrl || null)}
                        className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                        title="Click to view full photo"
                      >
                        <img
                          src={
                            report.photoUrl.startsWith('http')
                              ? report.photoUrl
                              : `http://localhost:3000${report.photoUrl}`
                          }
                          alt={report.reportNumber}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                          <Maximize2 size={16} className="text-white" />
                        </div>
                      </button>
                    ) : (
                      <div
                        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border ${hazard.border} ${hazard.bg}`}
                      >
                        {report.hazardType === 'FLOOD' || report.hazardType === 'RISING_WATER' ? (
                          <Waves className={hazard.color} size={26} />
                        ) : report.hazardType === 'FIRE' ? (
                          <Flame className={hazard.color} size={26} />
                        ) : report.hazardType === 'STRONG_WIND' ? (
                          <Wind className={hazard.color} size={26} />
                        ) : (
                          <AlertTriangle className={hazard.color} size={26} />
                        )}
                      </div>
                    )}

                    {/* Report Information */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {report.reportNumber}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${hazard.bg} ${hazard.color} ${hazard.border}`}
                        >
                          {hazard.label}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.bg} ${status.color}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>

                        {report.possibleDuplicate && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                            Possible Duplicate
                          </span>
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs text-slate-700 font-medium">
                        {report.description || 'No detailed description provided.'}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} className="text-teal-600" />
                          {report.city ? `${report.city}, ` : ''}
                          <strong className="text-slate-700">
                            {report.district || 'Unassigned'}
                          </strong>
                          {report.manualLocation &&
                          report.manualLocation !== report.city &&
                          report.manualLocation !== report.district
                            ? ` (${report.manualLocation})`
                            : ''}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <User size={13} className="text-slate-400" />
                          {report.citizenName || 'Citizen User'}
                          {report.citizenPhone &&
                            report.citizenPhone !== '—' &&
                            ` • ${report.citizenPhone}`}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          {report.submittedAt
                            ? new Date(report.submittedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Recently'}
                        </span>
                      </div>

                      {report.officerNotes && (
                        <div className="mt-2 rounded-md bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                          <strong className="font-semibold text-teal-800">Officer Notes:</strong>{' '}
                          {report.officerNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    {report.status === 'PENDING_VERIFICATION' && (
                      <button
                        type="button"
                        onClick={() => void handleQuickVerify(report)}
                        disabled={isUpdatingStatus}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                        title="Instantly verify report"
                      >
                        <Check size={14} />
                        Quick Verify
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openReportModal(report)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye size={14} />
                      Review & Verify
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Review & Verification Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Incident Report #{activeReport.reportNumber}
                  </h3>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      STATUS_CONFIG[activeReport.status]?.bg || ''
                    } ${STATUS_CONFIG[activeReport.status]?.color || ''}`}
                  >
                    {STATUS_CONFIG[activeReport.status]?.label || activeReport.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  District: <strong className="text-teal-700">{activeReport.district || 'Unassigned'}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-5 space-y-5">
              {/* Photo preview if available */}
              {activeReport.photoUrl && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                  <img
                    src={
                      activeReport.photoUrl.startsWith('http')
                        ? activeReport.photoUrl
                        : `http://localhost:3000${activeReport.photoUrl}`
                    }
                    alt={activeReport.reportNumber}
                    className="max-h-64 w-full object-contain"
                  />
                </div>
              )}

              {/* Hazard details grid */}
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium text-slate-400">Hazard Type</p>
                  <p className="mt-1 font-bold text-slate-900">
                    {HAZARD_LABELS[activeReport.hazardType]?.label || activeReport.hazardType}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium text-slate-400">District & City</p>
                  <p className="mt-1 font-bold text-slate-900">
                    {activeReport.city ? `${activeReport.city}, ` : ''}
                    {activeReport.district || 'Unassigned'}
                  </p>
                  {activeReport.manualLocation && (
                    <p className="text-[11px] text-slate-500">{activeReport.manualLocation}</p>
                  )}
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-medium text-slate-400">Reported At</p>
                  <p className="mt-1 font-bold text-slate-900">
                    {activeReport.submittedAt
                      ? new Date(activeReport.submittedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {activeReport.submittedAt
                      ? new Date(activeReport.submittedAt).toLocaleDateString()
                      : ''}
                  </p>
                </div>
              </div>

              {/* GPS Coordinates & Map Link */}
              {activeReport.latitude && activeReport.longitude && (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-teal-600" />
                    <span className="font-mono text-slate-700">
                      GPS: {activeReport.latitude.toFixed(5)}, {activeReport.longitude.toFixed(5)}
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${activeReport.latitude},${activeReport.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-teal-600 hover:text-teal-700"
                  >
                    Open in Maps ↗
                  </a>
                </div>
              )}

              {/* Reporter Info */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
                <p className="font-semibold text-slate-700">Citizen Reporter Details</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                  <span>
                    Name: <strong>{activeReport.citizenName || 'Citizen User'}</strong>
                  </span>
                  {activeReport.citizenPhone && (
                    <span>
                      Phone: <strong>{activeReport.citizenPhone}</strong>
                    </span>
                  )}
                  {activeReport.citizenEmail && (
                    <span>
                      Email: <strong>{activeReport.citizenEmail}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-slate-700">Field Description</p>
                <p className="mt-1 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 leading-relaxed">
                  {activeReport.description || 'No detailed description provided by the citizen.'}
                </p>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleSubmitVerification} className="border-t border-slate-200 pt-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Duty Officer Verification & Assessment
                </h4>

                {/* Status action buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVerificationStatus('VERIFIED')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-semibold transition ${
                      selectedVerificationStatus === 'VERIFIED'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/30'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Verify Report
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVerificationStatus('NEEDS_MORE_INFO')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-semibold transition ${
                      selectedVerificationStatus === 'NEEDS_MORE_INFO'
                        ? 'border-sky-600 bg-sky-50 text-sky-700 ring-2 ring-sky-500/30'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Info size={16} className="text-sky-600" />
                    Needs More Info
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVerificationStatus('REJECTED')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-semibold transition ${
                      selectedVerificationStatus === 'REJECTED'
                        ? 'border-rose-600 bg-rose-50 text-rose-700 ring-2 ring-rose-500/30'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle size={16} className="text-rose-600" />
                    Reject Report
                  </button>
                </div>

                {/* Officer Notes */}
                <div>
                  <label
                    className="block text-xs font-semibold text-slate-700"
                    htmlFor="officer-notes"
                  >
                    Officer Assessment / Response Notes
                  </label>
                  <textarea
                    id="officer-notes"
                    rows={2}
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Add operational notes, dispatch instructions, or verification comments..."
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Rejection reason (if rejected) */}
                {selectedVerificationStatus === 'REJECTED' && (
                  <div>
                    <label
                      className="block text-xs font-semibold text-rose-700"
                      htmlFor="rejection-reason"
                    >
                      Rejection Reason *
                    </label>
                    <input
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Specify why this report is rejected (e.g. duplicate, false alarm, resolved)..."
                      className="mt-1 w-full rounded-lg border border-rose-300 p-2 text-xs outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                      required
                    />
                  </div>
                )}

                {/* Submit buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveReport(null)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingStatus}
                    className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
                  >
                    {isUpdatingStatus ? 'Saving...' : 'Save Verification Status'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
            >
              <X size={20} />
            </button>
            <img
              src={
                previewImage.startsWith('http')
                  ? previewImage
                  : `http://localhost:3000${previewImage}`
              }
              alt="Report Preview"
              className="max-h-[85vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}

      {/* Log Incident Report Modal */}
      {showCreateModal && (
        <CreateIncidentModal
          token={token}
          districts={allDistricts}
          defaultDistrict={selectedDistrict !== 'ALL' ? selectedDistrict : (registeredDistrict || allDistricts[0] || 'Colombo')}
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

// Modal for logging an incident report with dynamic backend districts
interface CreateIncidentModalProps {
  token: string
  districts: string[]
  defaultDistrict: string
  onCreated: () => void
  onCancel: () => void
}

function CreateIncidentModal({
  token,
  districts,
  defaultDistrict,
  onCreated,
  onCancel,
}: CreateIncidentModalProps) {
  const [hazardType, setHazardType] = useState('FLOOD')
  const [customHazard, setCustomHazard] = useState('')
  const [district, setDistrict] = useState(defaultDistrict)
  const [city, setCity] = useState('')
  const [manualLocation, setManualLocation] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMessage('')

    if (!description.trim() && !photo) {
      setErrorMessage('Please provide a description or attach a photo.')
      return
    }

    try {
      setIsSubmitting(true)
      const formData = new FormData()
      formData.append('hazardType', hazardType)
      if (hazardType === 'OTHER' && customHazard) {
        formData.append('customHazardType', customHazard)
      }
      formData.append('district', district)
      if (city) formData.append('city', city)
      if (manualLocation) formData.append('manualLocation', manualLocation)
      if (description) formData.append('description', description)
      if (photo) formData.append('photo', photo)

      const res = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const result = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(result?.message || 'Failed to submit report')
      }

      onCreated()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error submitting report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Log Disaster Incident Report
            </h3>
            <p className="text-xs text-slate-500">
              Submit a field incident report directly to the database.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700" htmlFor="hazard-type">
              Hazard Type *
            </label>
            <select
              id="hazard-type"
              value={hazardType}
              onChange={(e) => setHazardType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-teal-500"
              required
            >
              <option value="FLOOD">Flood</option>
              <option value="RISING_WATER">Rising Water</option>
              <option value="LANDSLIDE">Landslide</option>
              <option value="LANDSLIDE_CRACK">Landslide Crack</option>
              <option value="BLOCKED_ROAD">Blocked Road</option>
              <option value="STRONG_WIND">Strong Wind</option>
              <option value="FIRE">Fire</option>
              <option value="EARTHQUAKE">Earthquake</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {hazardType === 'OTHER' && (
            <div>
              <label
                className="block text-xs font-semibold text-slate-700"
                htmlFor="custom-hazard"
              >
                Specify Hazard Type *
              </label>
              <input
                id="custom-hazard"
                value={customHazard}
                onChange={(e) => setCustomHazard(e.target.value)}
                placeholder="e.g. Chemical spill, Dam overflow..."
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-teal-500"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-semibold text-slate-700"
                htmlFor="district-select"
              >
                District *
              </label>
              <select
                id="district-select"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                required
              >
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d} District
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="city-input">
                City / Town
              </label>
              <input
                id="city-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Gunnepana, Kandy..."
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-semibold text-slate-700"
              htmlFor="manual-location"
            >
              Specific Location / Landmark
            </label>
            <input
              id="manual-location"
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              placeholder="e.g. Near Main Junction, Kelani River bank, Hospital road..."
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700" htmlFor="report-desc">
              Incident Description *
            </label>
            <textarea
              id="report-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide complete details about observed water levels, damage, casualties or risks..."
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700" htmlFor="report-photo">
              Upload Verification Photo (Optional)
            </label>
            <input
              id="report-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="mt-1 w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
