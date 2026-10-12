
import {
  Activity,
  Bell,
  Building2,
  Clock,
  History,
  House,
  LogOut,
  Users,
} from 'lucide-react'

interface ShelterStaffDashboardProps {
  fullName: string
  email: string
  district?: string
  onLogout: () => void
}

export default function ShelterStaffDashboard({
  fullName,
  email,
  district,
  onLogout,
}: ShelterStaffDashboardProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
          <div className="rounded-xl bg-amber-500 p-2.5 text-white">
            <House size={25} />
          </div>

          <div>
            <h1 className="font-bold text-slate-900">
              Disaster Management
            </h1>
            <p className="text-xs text-slate-500">Shelter Portal</p>
          </div>
        </div>

        <nav className="space-y-1 px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Shelter operations
          </p>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg bg-amber-50 px-3 py-3 text-left text-sm font-medium text-amber-700"
          >
            <Building2 size={19} />
            My Shelter
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Users size={19} />
            Occupancy Management
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <History size={19} />
            Occupancy History
          </button>
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
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div>
            <p className="text-sm text-slate-500">
              Shelter operations / Overview
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
            <p className="text-sm font-medium text-amber-700">
              Welcome back
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Hello, {fullName}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              View your assigned shelter and manage its occupancy.
            </p>
            {district && (
              <p className="mt-2 text-sm font-medium text-slate-600">
                District: {district}
              </p>
            )}
          </section>

          {/* Values will be populated from the backend. */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              title="Shelter Capacity"
              value="—"
              description="Maximum supported occupants"
              icon={<Building2 size={22} />}
            />
            <SummaryCard
              title="Current Occupancy"
              value="—"
              description="People currently accommodated"
              icon={<Users size={22} />}
            />
            <SummaryCard
              title="Last Updated"
              value="—"
              description="Latest occupancy update"
              icon={<Clock size={22} />}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                  <Building2 size={23} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">My Assigned Shelter</h3>
                  <p className="text-sm text-slate-500">
                    Shelter details and operational status
                  </p>
                </div>
              </div>

              <div className="mt-6 flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <House className="mb-3 text-slate-400" size={32} />
                <p className="font-medium text-slate-700">
                  Shelter information will appear here
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Your assigned shelter will be loaded from the backend.
                </p>
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal-50 p-3 text-teal-700">
                  <Activity size={23} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    Occupancy Management
                  </h3>
                  <p className="text-sm text-slate-500">
                    Current shelter occupancy
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-slate-50 p-4">
                <p className="text-sm leading-6 text-slate-600">
                  Occupancy update controls will be connected to the shelter
                  API next. Updates will be limited to shelters assigned to
                  your account.
                </p>
              </div>
            </article>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <History className="text-amber-600" size={23} />
              <div>
                <h3 className="font-bold text-slate-900">Occupancy History</h3>
                <p className="text-sm text-slate-500">
                  Previous shelter occupancy updates
                </p>
              </div>
            </div>

            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              Historical occupancy records will appear here after the API is
              connected.
            </p>
          </section>

          <footer className="border-t border-slate-200 pt-5 text-xs text-slate-400">
            Disaster Management System · Shelter Portal
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
  icon: React.ReactNode
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
