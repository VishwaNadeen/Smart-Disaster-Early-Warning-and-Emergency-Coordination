
import {
  Activity,
  Bell,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'

import RescueRequestsSection from '../dmc/rescue/RescueRequestsSection'

interface AdminDashboardProps {
  // [SE3070 - ADDED] Existing authenticated session token.
  token: string
  fullName: string
  email: string
  onLogout: () => void
}

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'User Management', icon: Users },
  { label: 'Shelter Management', icon: Building2 },
  { label: 'Disaster Reports', icon: ClipboardList },
  { label: 'System Monitoring', icon: Activity },
]

export default function AdminDashboard({
  // [SE3070 - ADDED]
  token,
  fullName,
  email,
  onLogout,
}: AdminDashboardProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
          <div className="rounded-xl bg-blue-600 p-2.5 text-white">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h1 className="font-bold text-slate-900">
              Disaster Management
            </h1>
            <p className="text-xs text-slate-500">Administration Portal</p>
          </div>
        </div>

        <nav className="space-y-1 px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Administration
          </p>

          {navigation.map(({ label, icon: Icon }, index) => (
            <button
              key={label}
              type="button"
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium ${
                index === 0
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-200 p-4">
          <div className="mb-3 rounded-lg bg-slate-50 p-3">
            <p className="truncate text-sm font-semibold text-slate-800">
              {fullName}
            </p>
            <p className="truncate text-xs text-slate-500">{email}</p>
            <p className="mt-2 text-xs font-medium text-blue-700">
              System Administrator
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
              Administration / Overview
            </p>
            <h2 className="text-lg font-bold text-slate-900">
              Admin Dashboard
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
            <p className="text-sm font-medium text-blue-700">
              Welcome back
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Hello, {fullName}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage users, shelters and system-wide disaster management
              operations.
            </p>
          </section>

          {/* Summary cards: live data will be added later. */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Users"
              value="—"
              description="Registered system users"
              icon={<Users size={22} />}
            />
            <SummaryCard
              title="Registered Shelters"
              value="—"
              description="Shelters in the system"
              icon={<Building2 size={22} />}
            />
            <SummaryCard
              title="Active Operations"
              value="—"
              description="Operations requiring monitoring"
              icon={<Activity size={22} />}
            />
            <SummaryCard
              title="System Status"
              value="—"
              description="Backend status will be connected later"
              icon={<ShieldCheck size={22} />}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
                  <Users size={23} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    User Management
                  </h3>
                  <p className="text-sm text-slate-500">
                    Manage personnel and account access
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-600">
                The user management module will allow authorized administrators
                to review users, assign roles and manage account status.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal-50 p-3 text-teal-700">
                  <Building2 size={23} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    Shelter Management
                  </h3>
                  <p className="text-sm text-slate-500">
                    Monitor registered shelters
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-600">
                Administrators will be able to review shelter information,
                operational status and occupancy across the system.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                  <ClipboardList size={23} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    Disaster Reports
                  </h3>
                  <p className="text-sm text-slate-500">
                    System-wide operational information
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-600">
                Reporting features will be added when the corresponding
                disaster and incident APIs are available.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-50 p-3 text-purple-700">
                  <Settings size={23} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    System Monitoring
                  </h3>
                  <p className="text-sm text-slate-500">
                    Application health and activity
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-600">
                System health, service availability and administrative activity
                monitoring will be integrated in a later step.
              </p>
            </article>
          </section>

          {/* [SE3070 - ADDED] Rescue requests and rescue-team assignment. */}
          <section aria-label="Rescue team assignment">
            <RescueRequestsSection token={token} />
          </section>

          <footer className="border-t border-slate-200 pt-5 text-xs text-slate-400">
            Disaster Management System · Administration Portal
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
        <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </article>
  )
}
