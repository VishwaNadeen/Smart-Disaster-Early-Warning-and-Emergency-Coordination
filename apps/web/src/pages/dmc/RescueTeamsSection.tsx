import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from 'lucide-react'

const API_URL = 'http://localhost:3000/api'

export type RescueTeamType =
  | 'ARMY'
  | 'NAVY'
  | 'AIR_FORCE'
  | 'POLICE'
  | 'FIRE_RESCUE'
  | 'COAST_GUARD'
  | 'MEDICAL_EMT'
  | 'DISASTER_RELIEF'
  | 'OTHER'

export type RescueTeamStatus =
  | 'AVAILABLE'
  | 'DEPLOYED'
  | 'STANDBY'
  | 'OFF_DUTY'

export interface RescueTeamItem {
  _id: string
  teamId: string
  teamName: string
  teamType: RescueTeamType
  memberCount: number
  district?: string
  baseStation?: string
  contactPerson?: string
  contactPhone?: string
  status: RescueTeamStatus
  specialization?: string[]
  notes?: string
  createdByName?: string
  createdAt?: string
  updatedAt?: string
}

interface RescueTeamsSectionProps {
  token: string
  registeredDistrict?: string
  assignedDistricts?: string[]
  role?: string
}

const TYPE_CONFIG: Record<
  RescueTeamType,
  { label: string; badge: string; border: string; bg: string }
> = {
  ARMY: {
    label: 'Sri Lanka Army',
    badge: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    border: 'border-emerald-500',
    bg: 'bg-emerald-500',
  },
  NAVY: {
    label: 'Sri Lanka Navy',
    badge: 'text-blue-800 bg-blue-50 border-blue-200',
    border: 'border-blue-500',
    bg: 'bg-blue-500',
  },
  AIR_FORCE: {
    label: 'Sri Lanka Air Force',
    badge: 'text-sky-800 bg-sky-50 border-sky-200',
    border: 'border-sky-500',
    bg: 'bg-sky-500',
  },
  POLICE: {
    label: 'Police & STF',
    badge: 'text-indigo-800 bg-indigo-50 border-indigo-200',
    border: 'border-indigo-500',
    bg: 'bg-indigo-500',
  },
  FIRE_RESCUE: {
    label: 'Fire & Rescue',
    badge: 'text-red-800 bg-red-50 border-red-200',
    border: 'border-red-500',
    bg: 'bg-red-500',
  },
  COAST_GUARD: {
    label: 'Coast Guard',
    badge: 'text-cyan-800 bg-cyan-50 border-cyan-200',
    border: 'border-cyan-500',
    bg: 'bg-cyan-500',
  },
  MEDICAL_EMT: {
    label: 'Medical & EMT',
    badge: 'text-rose-800 bg-rose-50 border-rose-200',
    border: 'border-rose-500',
    bg: 'bg-rose-500',
  },
  DISASTER_RELIEF: {
    label: 'Disaster Relief / Civil',
    badge: 'text-amber-800 bg-amber-50 border-amber-200',
    border: 'border-amber-500',
    bg: 'bg-amber-500',
  },
  OTHER: {
    label: 'Special Unit',
    badge: 'text-slate-800 bg-slate-100 border-slate-200',
    border: 'border-slate-500',
    bg: 'bg-slate-500',
  },
}

const STATUS_CONFIG: Record<
  RescueTeamStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  AVAILABLE: {
    label: 'Ready / Available',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  DEPLOYED: {
    label: 'Deployed in Field',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    dot: 'bg-blue-500 animate-pulse',
  },
  STANDBY: {
    label: 'On Standby Alert',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
  },
  OFF_DUTY: {
    label: 'Off Duty / Stand Down',
    color: 'text-slate-600',
    bg: 'bg-slate-100 border-slate-200',
    dot: 'bg-slate-400',
  },
}

export default function RescueTeamsSection({
  token,
  registeredDistrict,
  assignedDistricts,
}: RescueTeamsSectionProps) {
  // Dynamic districts loaded from backend API
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

  // Active district filter (defaults to registeredDistrict or ALL)
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    registeredDistrict || 'ALL',
  )

  // Teams state
  const [teams, setTeams] = useState<RescueTeamItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [teamToEdit, setTeamToEdit] = useState<RescueTeamItem | null>(null)
  const [teamToDelete, setTeamToDelete] = useState<RescueTeamItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form fields
  const [formTeamId, setFormTeamId] = useState('')
  const [formTeamName, setFormTeamName] = useState('')
  const [formTeamType, setFormTeamType] = useState<RescueTeamType>('ARMY')
  const [formMemberCount, setFormMemberCount] = useState<number>(10)
  const [formDistrict, setFormDistrict] = useState('')
  const [formBaseStation, setFormBaseStation] = useState('')
  const [formContactPerson, setFormContactPerson] = useState('')
  const [formContactPhone, setFormContactPhone] = useState('')
  const [formStatus, setFormStatus] = useState<RescueTeamStatus>('AVAILABLE')
  const [formSpecialization, setFormSpecialization] = useState('')
  const [formNotes, setFormNotes] = useState('')

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

  // 2. Fetch rescue teams from backend API
  const fetchTeams = useCallback(
    async (district: string) => {
      setIsLoading(true)
      setError('')
      try {
        const url = new URL(`${API_URL}/rescue-teams`)
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
          throw new Error(data?.message || `Failed to fetch rescue teams (${res.status})`)
        }

        const list: RescueTeamItem[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : []

        setTeams(list)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not fetch rescue teams.')
      } finally {
        setIsLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    void fetchTeams(selectedDistrict)
  }, [fetchTeams, selectedDistrict])

  // Open Add modal reset
  const handleOpenAddModal = () => {
    setFormTeamId('')
    setFormTeamName('')
    setFormTeamType('ARMY')
    setFormMemberCount(10)
    setFormDistrict(selectedDistrict !== 'ALL' ? selectedDistrict : registeredDistrict || '')
    setFormBaseStation('')
    setFormContactPerson('')
    setFormContactPhone('')
    setFormStatus('AVAILABLE')
    setFormSpecialization('')
    setFormNotes('')
    setFormError('')
    setShowAddModal(true)
  }

  // Open Edit modal with team values
  const handleOpenEditModal = (team: RescueTeamItem) => {
    setTeamToEdit(team)
    setFormTeamId(team.teamId)
    setFormTeamName(team.teamName)
    setFormTeamType(team.teamType)
    setFormMemberCount(team.memberCount)
    setFormDistrict(team.district || '')
    setFormBaseStation(team.baseStation || '')
    setFormContactPerson(team.contactPerson || '')
    setFormContactPhone(team.contactPhone || '')
    setFormStatus(team.status)
    setFormSpecialization(team.specialization ? team.specialization.join(', ') : '')
    setFormNotes(team.notes || '')
    setFormError('')
  }

  // Submit Add Team
  const handleSubmitAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!formTeamName.trim()) {
      setFormError('Team Name is required.')
      return
    }
    if (formMemberCount < 1) {
      setFormError('Member Count must be at least 1.')
      return
    }

    try {
      setIsSubmitting(true)
      setFormError('')

      const specs = formSpecialization
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const payload = {
        teamId: formTeamId.trim() || undefined,
        teamName: formTeamName.trim(),
        teamType: formTeamType,
        memberCount: Number(formMemberCount),
        district: formDistrict.trim() || undefined,
        baseStation: formBaseStation.trim() || undefined,
        contactPerson: formContactPerson.trim() || undefined,
        contactPhone: formContactPhone.trim() || undefined,
        status: formStatus,
        specialization: specs,
        notes: formNotes.trim() || undefined,
      }

      const res = await fetch(`${API_URL}/rescue-teams`, {
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
        throw new Error(result?.message || 'Failed to create rescue team.')
      }

      setShowAddModal(false)
      void fetchTeams(selectedDistrict)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create team.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Edit Team
  const handleSubmitEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!teamToEdit) return
    if (!formTeamName.trim()) {
      setFormError('Team Name is required.')
      return
    }
    if (formMemberCount < 1) {
      setFormError('Member Count must be at least 1.')
      return
    }

    try {
      setIsSubmitting(true)
      setFormError('')

      const specs = formSpecialization
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const payload = {
        teamId: formTeamId.trim() || undefined,
        teamName: formTeamName.trim(),
        teamType: formTeamType,
        memberCount: Number(formMemberCount),
        district: formDistrict.trim() || undefined,
        baseStation: formBaseStation.trim() || undefined,
        contactPerson: formContactPerson.trim() || undefined,
        contactPhone: formContactPhone.trim() || undefined,
        status: formStatus,
        specialization: specs,
        notes: formNotes.trim() || undefined,
      }

      const res = await fetch(`${API_URL}/rescue-teams/${teamToEdit._id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(result?.message || 'Failed to update rescue team.')
      }

      setTeamToEdit(null)
      void fetchTeams(selectedDistrict)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update team.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Quick Status change
  const handleQuickStatusChange = async (
    team: RescueTeamItem,
    newStatus: RescueTeamStatus,
  ) => {
    try {
      const res = await fetch(`${API_URL}/rescue-teams/${team._id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.message || 'Status update failed.')
      }
      void fetchTeams(selectedDistrict)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status.')
    }
  }

  // Delete team
  const handleDeleteTeam = async () => {
    if (!teamToDelete) return
    try {
      setIsSubmitting(true)
      const res = await fetch(`${API_URL}/rescue-teams/${teamToDelete._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Failed to delete team.')
      }
      setTeamToDelete(null)
      void fetchTeams(selectedDistrict)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete team.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered list
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (selectedType !== 'ALL' && t.teamType !== selectedType) {
        return false
      }
      if (selectedStatus !== 'ALL' && t.status !== selectedStatus) {
        return false
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchesName = t.teamName?.toLowerCase().includes(q)
        const matchesId = t.teamId?.toLowerCase().includes(q)
        const matchesLeader = t.contactPerson?.toLowerCase().includes(q)
        const matchesBase = t.baseStation?.toLowerCase().includes(q)
        const matchesDist = t.district?.toLowerCase().includes(q)
        if (!matchesName && !matchesId && !matchesLeader && !matchesBase && !matchesDist) {
          return false
        }
      }
      return true
    })
  }, [teams, selectedType, selectedStatus, searchTerm])

  // Calculated KPI stats
  const totalTeams = teams.length
  const totalMembers = useMemo(
    () => teams.reduce((acc, t) => acc + (t.memberCount || 0), 0),
    [teams],
  )
  const deployedCount = useMemo(
    () => teams.filter((t) => t.status === 'DEPLOYED').length,
    [teams],
  )
  const availableCount = useMemo(
    () => teams.filter((t) => t.status === 'AVAILABLE').length,
    [teams],
  )

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Emergency Rescue Teams
                </h2>
                {selectedDistrict === registeredDistrict && registeredDistrict && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                    <Shield size={12} />
                    Registered Duty District
                  </span>
                )}
                {selectedDistrict === 'ALL' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    National Disaster Coordination
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Deploy, coordinate, and monitor Tri-Forces, Police STF, Fire & Rescue units, and special relief teams.
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

            {/* Register New Rescue Team Button (DMC Officer only) */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 active:scale-98"
            >
              <Plus size={16} />
              Add Rescue Team
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
                Total Rescue Teams
              </p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {isLoading ? '…' : totalTeams}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedDistrict === 'ALL' ? 'Islandwide force' : `Assigned to ${selectedDistrict}`}
              </p>
            </div>
            <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
              <ShieldAlert size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Deployed in Field
              </p>
              <p className="mt-2 text-3xl font-extrabold text-blue-700">
                {isLoading ? '…' : deployedCount}
              </p>
              <p className="mt-1 text-xs text-blue-600 font-medium">
                Active in disaster operations
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
              <Radio size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Ready for Dispatch
              </p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-700">
                {isLoading ? '…' : availableCount}
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">
                Available on immediate standby
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Personnel
              </p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {isLoading ? '…' : totalMembers.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Rescue officers & crew members
              </p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700">
              <Users size={22} />
            </div>
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
              placeholder="Search by team name, ID, base station, or leader..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50/50 py-2 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-teal-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Team Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Type:
              </span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500"
              >
                <option value="ALL">All Types</option>
                <option value="ARMY">Sri Lanka Army</option>
                <option value="NAVY">Sri Lanka Navy</option>
                <option value="AIR_FORCE">Air Force</option>
                <option value="POLICE">Police & STF</option>
                <option value="FIRE_RESCUE">Fire & Rescue</option>
                <option value="COAST_GUARD">Coast Guard</option>
                <option value="MEDICAL_EMT">Medical & EMT</option>
                <option value="DISASTER_RELIEF">Disaster Relief</option>
                <option value="OTHER">Other Special</option>
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
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Ready / Available</option>
                <option value="DEPLOYED">Deployed</option>
                <option value="STANDBY">On Standby</option>
                <option value="OFF_DUTY">Off Duty</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchTeams(selectedDistrict)}
              disabled={isLoading}
              title="Refresh rescue teams"
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

      {/* Teams Table & Cards */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Rescue Teams Directory ({filteredTeams.length})
            </h3>
            <span className="text-xs font-medium text-slate-500">
              Only DMC Officers have dispatch and modification authority
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-teal-600" />
            <p className="text-xs font-medium">Loading emergency rescue teams from database...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-slate-100 p-4 text-slate-400">
              <ShieldAlert size={32} />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-800">
              No rescue teams found
            </h4>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {selectedDistrict !== 'ALL'
                ? `No rescue teams currently assigned to ${selectedDistrict} District.`
                : 'No emergency rescue teams have been registered yet.'}
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700"
            >
              <Plus size={14} />
              Register New Rescue Team
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-100/60 font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3.5">Team ID & Name</th>
                  <th className="px-5 py-3.5">Type & Unit</th>
                  <th className="px-5 py-3.5">Personnel</th>
                  <th className="px-5 py-3.5">District / Station</th>
                  <th className="px-5 py-3.5">Leader & Contact</th>
                  <th className="px-5 py-3.5">Deployment Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTeams.map((team) => {
                  const typeMeta = TYPE_CONFIG[team.teamType] || TYPE_CONFIG.OTHER
                  const statusMeta = STATUS_CONFIG[team.status] || STATUS_CONFIG.AVAILABLE

                  return (
                    <tr
                      key={team._id}
                      className="transition hover:bg-slate-50/80"
                    >
                      {/* Team ID & Name */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-teal-800">
                            {team.teamId}
                          </span>
                          <span className="mt-0.5 font-bold text-slate-900 text-sm">
                            {team.teamName}
                          </span>
                          {team.notes && (
                            <span className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                              {team.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Team Type */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${typeMeta.badge}`}
                        >
                          {typeMeta.label}
                        </span>
                        {team.specialization && team.specialization.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {team.specialization.slice(0, 2).map((spec, i) => (
                              <span
                                key={i}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                              >
                                {spec}
                              </span>
                            ))}
                            {team.specialization.length > 2 && (
                              <span className="text-[10px] text-slate-400">
                                +{team.specialization.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Member Count */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Users size={14} className="text-teal-600" />
                          <span>{team.memberCount} members</span>
                        </div>
                      </td>

                      {/* District & Base Station */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" />
                            {team.district ? `${team.district} District` : 'National Pool'}
                          </span>
                          {team.baseStation && (
                            <span className="mt-0.5 text-[11px] text-slate-500">
                              Base: {team.baseStation}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Leader & Contact */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {team.contactPerson || 'Not assigned'}
                          </span>
                          {team.contactPhone && (
                            <a
                              href={`tel:${team.contactPhone}`}
                              className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:underline"
                            >
                              <Phone size={11} />
                              {team.contactPhone}
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Status & Quick Change */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.bg} ${statusMeta.color}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                            {statusMeta.label}
                          </span>

                          <select
                            value={team.status}
                            onChange={(e) =>
                              handleQuickStatusChange(
                                team,
                                e.target.value as RescueTeamStatus,
                              )
                            }
                            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 outline-none hover:border-teal-500"
                            title="Quick switch status"
                          >
                            <option value="AVAILABLE">Set Available</option>
                            <option value="DEPLOYED">Set Deployed</option>
                            <option value="STANDBY">Set Standby</option>
                            <option value="OFF_DUTY">Set Off Duty</option>
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(team)}
                            title="Edit Rescue Team"
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:border-teal-500 hover:text-teal-700"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTeamToDelete(team)}
                            title="Remove Team"
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:border-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD RESCUE TEAM */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-teal-100 p-2.5 text-teal-700">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Register New Rescue Team
                </h3>
                <p className="text-xs text-slate-500">
                  DMC Officer Portal — Add Army, Navy, Air Force, Police, or civilian rescue units.
                </p>
              </div>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitAdd} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Team ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Team ID (Optional / Auto-generated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RT-ARM-002 (Leave empty to auto-generate)"
                    value={formTeamId}
                    onChange={(e) => setFormTeamId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono outline-none focus:border-teal-500"
                  />
                </div>

                {/* Team Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Team Type / Branch *
                  </label>
                  <select
                    value={formTeamType}
                    onChange={(e) => setFormTeamType(e.target.value as RescueTeamType)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                  >
                    <option value="ARMY">Sri Lanka Army</option>
                    <option value="NAVY">Sri Lanka Navy (Special Boat Sqd)</option>
                    <option value="AIR_FORCE">Sri Lanka Air Force</option>
                    <option value="POLICE">Sri Lanka Police / STF</option>
                    <option value="FIRE_RESCUE">Fire & Rescue Department</option>
                    <option value="COAST_GUARD">Coast Guard Disaster Unit</option>
                    <option value="MEDICAL_EMT">Medical & EMT Field Unit</option>
                    <option value="DISASTER_RELIEF">Civil Defence / Red Cross Relief</option>
                    <option value="OTHER">Other Specialized Unit</option>
                  </select>
                </div>
              </div>

              {/* Team Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Team Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2nd Special Boat Squadron Flood Relief Unit"
                  value={formTeamName}
                  onChange={(e) => setFormTeamName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Member Count */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    How Many Team Members? *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formMemberCount}
                    onChange={(e) => setFormMemberCount(Math.max(1, Number(e.target.value)))}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Stationed District
                  </label>
                  <select
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-teal-500"
                  >
                    <option value="">National / Islandwide Pool</option>
                    {allDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d} District
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Base Station */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Base Station / Unit Headquarters
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Welisara Navy Base / Kandy Police Station"
                    value={formBaseStation}
                    onChange={(e) => setFormBaseStation(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Initial Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as RescueTeamStatus)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                  >
                    <option value="AVAILABLE">Ready / Available</option>
                    <option value="STANDBY">On Standby Alert</option>
                    <option value="DEPLOYED">Deployed in Field</option>
                    <option value="OFF_DUTY">Off Duty</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Contact Person */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Team Leader / Officer-in-Charge
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lt. Commander Fernando"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Emergency Hotline / Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +94 11 243 4567"
                    value={formContactPhone}
                    onChange={(e) => setFormContactPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Specializations / Equipment (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diving, Swift Water Boats, Chainsaws, Landslide Search, First Aid"
                  value={formSpecialization}
                  onChange={(e) => setFormSpecialization(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Operational Notes & Readiness
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Equipped with 4 inflatable dinghies and satellite communications."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Confirm & Register Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT RESCUE TEAM */}
      {teamToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setTeamToEdit(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-teal-100 p-2.5 text-teal-700">
                <Pencil size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Edit Rescue Team ({teamToEdit.teamId})
                </h3>
                <p className="text-xs text-slate-500">
                  Update team size, deployment status, base station, or contact person.
                </p>
              </div>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitEdit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Team ID
                  </label>
                  <input
                    type="text"
                    value={formTeamId}
                    onChange={(e) => setFormTeamId(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Team Type / Branch *
                  </label>
                  <select
                    value={formTeamType}
                    onChange={(e) => setFormTeamType(e.target.value as RescueTeamType)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                  >
                    <option value="ARMY">Sri Lanka Army</option>
                    <option value="NAVY">Sri Lanka Navy</option>
                    <option value="AIR_FORCE">Sri Lanka Air Force</option>
                    <option value="POLICE">Sri Lanka Police / STF</option>
                    <option value="FIRE_RESCUE">Fire & Rescue Department</option>
                    <option value="COAST_GUARD">Coast Guard</option>
                    <option value="MEDICAL_EMT">Medical & EMT</option>
                    <option value="DISASTER_RELIEF">Disaster Relief / Civil</option>
                    <option value="OTHER">Other Specialized Unit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={formTeamName}
                  onChange={(e) => setFormTeamName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    How Many Team Members? *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formMemberCount}
                    onChange={(e) => setFormMemberCount(Math.max(1, Number(e.target.value)))}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Stationed District
                  </label>
                  <select
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-teal-500"
                  >
                    <option value="">National / Islandwide Pool</option>
                    {allDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d} District
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Base Station
                  </label>
                  <input
                    type="text"
                    value={formBaseStation}
                    onChange={(e) => setFormBaseStation(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Deployment Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as RescueTeamStatus)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                  >
                    <option value="AVAILABLE">Ready / Available</option>
                    <option value="STANDBY">On Standby Alert</option>
                    <option value="DEPLOYED">Deployed in Field</option>
                    <option value="OFF_DUTY">Off Duty</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Team Leader / Contact Person
                  </label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formContactPhone}
                    onChange={(e) => setFormContactPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Specializations / Equipment
                </label>
                <input
                  type="text"
                  value={formSpecialization}
                  onChange={(e) => setFormSpecialization(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Operational Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-teal-500"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTeamToEdit(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-100 p-2.5 text-red-600">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Rescue Team
                </h3>
                <p className="text-xs text-slate-500">
                  This action will unregister this team from active deployment.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              <p>
                Are you sure you want to delete{' '}
                <strong className="text-slate-900">{teamToDelete.teamName}</strong>{' '}
                (<span className="font-mono text-teal-800">{teamToDelete.teamId}</span>)?
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTeamToDelete(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTeam}
                disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
