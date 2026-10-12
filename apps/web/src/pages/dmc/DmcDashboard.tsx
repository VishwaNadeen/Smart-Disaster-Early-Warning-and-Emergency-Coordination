import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  House,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  RefreshCw,
  Pencil,
  PackagePlus,
  ShieldAlert,
  Megaphone,
} from 'lucide-react'

import CreateShelterForm from './CreateShelterForm'
import EditShelterForm, { type ShelterToEdit } from './EditShelterForm'
import ShelterMap, { type MapShelter } from './ShelterMap'
import ReliefSuppliesPage from './ReliefSuppliesPage'
import DisasterReportsSection from './DisasterReportsSection'
import DisasterWarningsSection from './DisasterWarningsSection'
import RescueTeamsSection from './RescueTeamsSection'

const API_URL = 'http://localhost:3000/api'

interface DmcDashboardProps {
  token: string
  fullName: string
  email: string
  role: string
  district?: string
  assignedDistricts?: string[]
  onLogout: () => void
}

type DashboardSection =
  | 'Overview'
  | 'Shelters'
  | 'Disaster Reports'
  | 'Warning Alerts'
  | 'Rescue Teams'
  | 'Occupancy Monitoring'
  | 'Occupancy History'
  | 'Relief Supplies'

type Shelter = Omit<ShelterToEdit, 'operationalStatus'> &
  Omit<MapShelter, 'operationalStatus'> & {
    operationalStatus: 'OPEN' | 'CLOSED' | 'MAINTENANCE'
    currentOccupancy?: number
    isActive?: boolean
  }

interface ShelterApiResponse {
  data?: Shelter[] | { shelters?: Shelter[]; items?: Shelter[] }
  shelters?: Shelter[]
  items?: Shelter[]
  message?: string
}

const navigation = [
  { label: 'Overview' as const, icon: LayoutDashboard },
  { label: 'Shelters' as const, icon: House },
  { label: 'Disaster Reports' as const, icon: AlertTriangle },
  { label: 'Warning Alerts' as const, icon: Megaphone },
  { label: 'Rescue Teams' as const, icon: ShieldAlert },
  { label: 'Occupancy Monitoring' as const, icon: Users },
  { label: 'Occupancy History' as const, icon: ClipboardList },
  { label: 'Relief Supplies' as const, icon: PackagePlus },
]

function getSheltersFromResponse(
  result: ShelterApiResponse | Shelter[],
): Shelter[] {
  if (Array.isArray(result)) return result
  if (Array.isArray(result.data)) return result.data
  if (result.data && !Array.isArray(result.data)) {
    if (Array.isArray(result.data.shelters)) return result.data.shelters
    if (Array.isArray(result.data.items)) return result.data.items
  }
  if (Array.isArray(result.shelters)) return result.shelters
  if (Array.isArray(result.items)) return result.items
  return []
}

export default function DmcDashboard({
  token,
  fullName,
  email,
  role,
  district,
  assignedDistricts,
  onLogout,
}: DmcDashboardProps) {
  const [activeSection, setActiveSection] =
    useState<DashboardSection>('Overview')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingShelter, setEditingShelter] =
    useState<ShelterToEdit | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [isLoadingShelters, setIsLoadingShelters] = useState(false)
  const [shelterError, setShelterError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingReportsCount, setPendingReportsCount] = useState(0)
  const [activeWarningsCount, setActiveWarningsCount] = useState(0)
  const [rescueTeamsCount, setRescueTeamsCount] = useState(0)

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const query = district
          ? `?district=${encodeURIComponent(district)}`
          : ''
        const res = await fetch(`${API_URL}/reports${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        const list = Array.isArray(data?.data) ? data.data : []
        const pending = list.filter(
          (r: any) => r.status === 'PENDING_VERIFICATION',
        ).length
        setPendingReportsCount(pending)
      } catch {
        // silent fallback
      }
    }
    void fetchPendingCount()
  }, [token, district])

  useEffect(() => {
    async function fetchWarningsCount() {
      try {
        const res = await fetch(`${API_URL}/hazard-alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        const list = Array.isArray(data?.data) ? data.data : []
        const active = list.filter((a: any) => a.status === 'PUBLISHED').length
        setActiveWarningsCount(active)
      } catch {
        // silent fallback
      }
    }
    void fetchWarningsCount()
  }, [token])

  useEffect(() => {
    async function fetchTeamsCount() {
      try {
        const query = district
          ? `?district=${encodeURIComponent(district)}`
          : ''
        const res = await fetch(`${API_URL}/rescue-teams${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        const count = Array.isArray(data?.data) ? data.data.length : 0
        setRescueTeamsCount(count)
      } catch {
        // silent fallback
      }
    }
    void fetchTeamsCount()
  }, [token, district])

  const loadShelters = useCallback(async () => {
    setIsLoadingShelters(true)
    setShelterError('')
    try {
      const response = await fetch(`${API_URL}/shelters`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          typeof result?.message === 'string'
            ? result.message
            : `Unable to load shelters (HTTP ${response.status}).`
        throw new Error(message)
      }
      setShelters(getSheltersFromResponse(result ?? {}))
    } catch (error) {
      setShelterError(
        error instanceof Error
          ? error.message
          : 'Unable to connect to the shelter API.',
      )
    } finally {
      setIsLoadingShelters(false)
    }
  }, [token])

  useEffect(() => {
    void loadShelters()
  }, [loadShelters, refreshKey])

  function handleShelterCreated() {
    setShowCreateForm(false)
    setEditingShelter(null)
    setActiveSection('Shelters')
    setRefreshKey((previous) => previous + 1)
  }

  function handleShelterUpdated() {
    setEditingShelter(null)
    setShowCreateForm(false)
    setActiveSection('Shelters')
    setRefreshKey((previous) => previous + 1)
  }

  function handleEditShelter(shelter: Shelter) {
    const shelterId = shelter._id ?? shelter.id
    if (!shelterId) {
      setShelterError(
        'Cannot edit this shelter because its ID was not returned by the API.',
      )
      return
    }
    setShelterError('')
    setShowCreateForm(false)
    setEditingShelter(shelter)
  }

  const filteredShelters = shelters.filter((shelter) => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return true
    return [
      shelter.name,
      shelter.shelterCode,
      shelter.city,
      shelter.district,
      shelter.province,
      shelter.address,
      shelter.operationalStatus,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  const totalCapacity = shelters.reduce(
    (total, shelter) => total + (Number(shelter.maximumCapacity) || 0),
    0,
  )
  const currentOccupancy = shelters.reduce(
    (total, shelter) => total + (Number(shelter.currentOccupancy) || 0),
    0,
  )
  const activeShelters = shelters.filter(
    (shelter) =>
      shelter.isActive !== false && shelter.operationalStatus === 'OPEN',
  ).length
  const utilization =
    totalCapacity > 0
      ? `${Math.round((currentOccupancy / totalCapacity) * 100)}%`
      : '—'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
          <div className="rounded-xl bg-teal-600 p-2.5 text-white">
            <ShieldCheck size={25} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">Disaster Management</h1>
            <p className="text-xs text-slate-500">Operations Portal</p>
          </div>
        </div>

        <div className="px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Main menu
          </p>
          <nav className="space-y-1">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setActiveSection(label)
                  setShowCreateForm(false)
                  setEditingShelter(null)
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
                  activeSection === label
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={19} />
                  {label}
                </div>
                {label === 'Disaster Reports' && pendingReportsCount > 0 && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                    {pendingReportsCount}
                  </span>
                )}
                {label === 'Warning Alerts' && activeWarningsCount > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs animate-pulse">
                    {activeWarningsCount}
                  </span>
                )}
                {label === 'Rescue Teams' && rescueTeamsCount > 0 && (
                  <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                    {rescueTeamsCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <div className="rounded-full bg-teal-100 p-2 text-teal-700">
              <MapPinned size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {role.replaceAll('_', ' ')}
              </p>
              <p className="truncate text-xs font-medium text-slate-500">
                {district ? `${district} District` : 'Authorized operations'}
              </p>
            </div>
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

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div>
            <p className="text-sm text-slate-500">
              Disaster response / Operations
            </p>
            <h2 className="text-lg font-bold text-slate-900">
              DMC Operations Dashboard
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
            >
              <Bell size={19} />
            </button>
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800">
                  {fullName}
                </p>
                <p className="text-xs text-slate-500">{email}</p>
              </div>
              <ChevronDown size={17} className="text-slate-400" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8">
          <section>
            <p className="text-sm font-medium text-teal-700">Welcome back</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Hello, {fullName}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Monitor shelter readiness and coordinate disaster response
              activities from one place.
            </p>
          </section>

          {/* Section heading + actions (hidden for report/warning/team pages) */}
          {activeSection !== 'Disaster Reports' &&
            activeSection !== 'Warning Alerts' &&
            activeSection !== 'Rescue Teams' && (
              <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {activeSection === 'Overview'
                      ? 'Operations Overview'
                      : activeSection}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {activeSection === 'Shelters'
                      ? 'Manage and monitor emergency shelter readiness and capacity.'
                      : 'Monitor shelter readiness and coordinate disaster response operations.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeSection === 'Shelters' && (
                    <>
                      <button
                        type="button"
                        onClick={() => void loadShelters()}
                        disabled={isLoadingShelters}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <RefreshCw
                          size={17}
                          className={isLoadingShelters ? 'animate-spin' : ''}
                        />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingShelter(null)
                          setShelterError('')
                          setShowCreateForm(true)
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                      >
                        <Plus size={18} />
                        Create Shelter
                      </button>
                    </>
                  )}
                </div>
              </section>
            )}

          {/* Create / Edit forms */}
          {showCreateForm && (
            <CreateShelterForm
              token={token}
              onCreated={handleShelterCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          )}

          {!showCreateForm && editingShelter && (
            <EditShelterForm
              shelter={editingShelter}
              token={token}
              onUpdated={handleShelterUpdated}
              onCancel={() => setEditingShelter(null)}
            />
          )}

          {/* ===================== OVERVIEW ===================== */}
          {!showCreateForm &&
            !editingShelter &&
            activeSection === 'Overview' && (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    title="Total Shelters"
                    value={isLoadingShelters ? '…' : String(shelters.length)}
                    description="Registered shelters returned by the API"
                    icon={<Building2 size={22} />}
                  />
                  <SummaryCard
                    title="Open Shelters"
                    value={isLoadingShelters ? '…' : String(activeShelters)}
                    description="Shelters with OPEN status"
                    icon={<House size={22} />}
                  />
                  <SummaryCard
                    title="Current Occupancy"
                    value={
                      isLoadingShelters
                        ? '…'
                        : currentOccupancy.toLocaleString()
                    }
                    description="People currently accommodated"
                    icon={<Users size={22} />}
                  />
                  <SummaryCard
                    title="Capacity Utilization"
                    value={isLoadingShelters ? '…' : utilization}
                    description="Occupancy compared with total capacity"
                    icon={<Activity size={22} />}
                  />
                </section>

                {/* Quick action cards */}
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                  <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Shelter Operations
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Overview of registered emergency shelters
                        </p>
                      </div>
                      <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
                        <Building2 size={22} />
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-700">
                        {shelters.length} shelter(s) loaded
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveSection('Shelters')}
                        className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                      >
                        View shelters →
                      </button>
                    </div>
                    {shelterError && (
                      <p role="alert" className="mt-3 text-sm text-red-600">
                        {shelterError}
                      </p>
                    )}
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {district
                            ? `${district} District Reports`
                            : 'District Reports'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Citizen & field hazard reports
                        </p>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700">
                        <AlertTriangle size={22} />
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-800">
                        <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                        <span className="font-bold text-amber-900">
                          {pendingReportsCount}
                        </span>{' '}
                        pending verification
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('Disaster Reports')}
                        className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                      >
                        Review reports →
                      </button>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Warning Alerts
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Push & WhatsApp broadcasts
                        </p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-2.5 text-red-600">
                        <Megaphone size={22} />
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50/50 p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-800">
                        <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-red-600" />
                        <span className="font-bold text-red-900">
                          {activeWarningsCount}
                        </span>{' '}
                        active bulletin(s)
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('Warning Alerts')}
                        className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                      >
                        Issue / View →
                      </button>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Rescue Teams
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Tri-Forces, Police & Relief units
                        </p>
                      </div>
                      <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
                        <ShieldAlert size={22} />
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-100 bg-teal-50/50 p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-800">
                        <span className="inline-flex h-2 w-2 rounded-full bg-teal-500" />
                        <span className="font-bold text-teal-900">
                          {rescueTeamsCount}
                        </span>{' '}
                        registered unit(s)
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('Rescue Teams')}
                        className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                      >
                        Manage teams →
                      </button>
                    </div>
                  </section>
                </div>

                {/* Shelter Map */}
                {shelterError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  >
                    <p className="font-semibold">Could not load shelters</p>
                    <p className="mt-1">{shelterError}</p>
                    <button
                      type="button"
                      onClick={() => void loadShelters()}
                      className="mt-3 font-semibold underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Shelter Locations
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Select a marker to view shelter details.
                      </p>
                    </div>
                    <MapPinned className="text-teal-600" size={23} />
                  </div>

                  {isLoadingShelters && shelters.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
                      <RefreshCw size={18} className="animate-spin" />
                      Loading shelter locations…
                    </div>
                  ) : shelters.length > 0 ? (
                    <ShelterMap shelters={shelters} />
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                      <House size={34} className="mx-auto text-slate-400" />
                      <p className="mt-3 font-semibold text-slate-800">
                        No shelters to display
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Check the API response and your account permissions, or
                        create a shelter with valid coordinates.
                      </p>
                    </div>
                  )}
                </section>
              </>
            )}

          {/* ===================== SHELTERS ===================== */}
          {!showCreateForm &&
            !editingShelter &&
            activeSection === 'Shelters' && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Registered Shelters
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {filteredShelters.length} shelter(s) displayed
                    </p>
                  </div>
                  <div className="relative w-full sm:max-w-sm">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search name, code, city or district..."
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </div>
                </div>

                {shelterError && (
                  <div
                    role="alert"
                    className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  >
                    <p className="font-semibold">Could not load shelters</p>
                    <p className="mt-1">{shelterError}</p>
                    <p className="mt-2">
                      Check that the backend is running and your account has
                      permission to view shelters.
                    </p>
                  </div>
                )}

                {isLoadingShelters ? (
                  <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
                    <RefreshCw size={18} className="animate-spin" />
                    Loading shelters...
                  </div>
                ) : !shelterError && filteredShelters.length === 0 ? (
                  <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                    <House size={34} className="mx-auto text-slate-400" />
                    <p className="mt-3 font-semibold text-slate-800">
                      {shelters.length === 0
                        ? 'No shelters returned'
                        : 'No matching shelters'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {shelters.length === 0
                        ? 'If you already created a shelter, check the API response and user permissions.'
                        : 'Try a different search term.'}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[950px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Shelter</th>
                          <th className="px-4 py-3 font-semibold">Location</th>
                          <th className="px-4 py-3 font-semibold">Capacity</th>
                          <th className="px-4 py-3 font-semibold">Occupancy</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 text-right font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredShelters.map((shelter, index) => (
                          <tr
                            key={
                              shelter._id ??
                              shelter.id ??
                              shelter.shelterCode ??
                              index
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-900">
                                {shelter.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {shelter.shelterCode}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-slate-800">
                                {shelter.city}, {shelter.district}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {shelter.province}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              {shelter.maximumCapacity}
                            </td>
                            <td className="px-4 py-4">
                              {shelter.currentOccupancy ?? 0}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  shelter.operationalStatus === 'OPEN'
                                    ? 'bg-green-50 text-green-700'
                                    : shelter.operationalStatus ===
                                        'MAINTENANCE'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {shelter.operationalStatus?.replaceAll(
                                  '_',
                                  ' ',
                                ) ?? 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleEditShelter(shelter)}
                                className="inline-flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                              >
                                <Pencil size={15} />
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

          {/* ===================== DISASTER REPORTS ===================== */}
          {!showCreateForm &&
            !editingShelter &&
            activeSection === 'Disaster Reports' && (
              <DisasterReportsSection
                token={token}
                registeredDistrict={district}
                assignedDistricts={assignedDistricts}
                role={role}
                onPendingCountChange={setPendingReportsCount}
              />
            )}

          {/* ===================== WARNING ALERTS ===================== */}
          {!showCreateForm &&
            !editingShelter &&
            activeSection === 'Warning Alerts' && (
              <DisasterWarningsSection
                token={token}
                registeredDistrict={district}
                assignedDistricts={assignedDistricts}
                role={role}
                onActiveCountChange={setActiveWarningsCount}
              />
            )}

          {/* ===================== RESCUE TEAMS ===================== */}
          {!showCreateForm &&
            !editingShelter &&
            activeSection === 'Rescue Teams' && (
              <RescueTeamsSection
                token={token}
                registeredDistrict={district}
                assignedDistricts={assignedDistricts}
                role={role}
              />
            )}

          {/* ===================== OCCUPANCY ===================== */}
          {!showCreateForm &&
            !editingShelter &&
            (activeSection === 'Occupancy Monitoring' ||
              activeSection === 'Occupancy History') && (
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  {activeSection === 'Occupancy Monitoring' ? (
                    <Users className="text-teal-600" size={24} />
                  ) : (
                    <ClipboardList className="text-teal-600" size={24} />
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {activeSection}
                    </h3>
                    <p className="text-sm text-slate-500">
                      This section still needs its occupancy API integration.
                    </p>
                  </div>
                </div>
              </section>
            )}

          {/* ===================== RELIEF SUPPLIES ===================== */}
          {!showCreateForm &&
            !editingShelter &&
            activeSection === 'Relief Supplies' && (
              <ReliefSuppliesPage
                token={token}
                role={role}
                district={district}
              />
            )}

          <footer className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-400">
            <span>Disaster Management System</span>
            <span className="flex items-center gap-1.5">
              <Settings size={14} />
              Operations Portal
            </span>
          </footer>
        </main>
      </div>
    </div>
  )
}

interface SummaryCardProps {
  title: string
  value: string
  description: string
  icon: ReactNode
}

function SummaryCard({ title, value, description, icon }: SummaryCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-lg bg-teal-50 p-3 text-teal-700">{icon}</div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </article>
  )
}