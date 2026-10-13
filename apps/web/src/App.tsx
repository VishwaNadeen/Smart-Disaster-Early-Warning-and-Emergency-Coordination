
import { useState } from 'react'

import Login, { type AuthUser } from './components/Login'
import DmcDashboard from './pages/dmc/DmcDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import ShelterStaffDashboard from './pages/shelter/ShelterStaffDashboard'

interface Session {
  token: string
  user: AuthUser
}

function App() {
  const [session, setSession] = useState<Session | null>(null)

  function handleLogin(token: string, user: AuthUser) {
    setSession({ token, user })
  }

  function handleLogout() {
    setSession(null)
  }

  // Show the common login screen when nobody is signed in.
  if (!session) {
    return <Login onLogin={handleLogin} />
  }

  const { user, token } = session

  // DMC and District Officers share one dashboard.
  switch (user.role) {
    case 'DUTY_OFFICER':
    case 'DISTRICT_OFFICER':
      return (
        <DmcDashboard
          token={token}
          fullName={user.fullName}
          email={user.email}
          role={user.role}
          district={user.district || user.assignedDistricts?.[0]}
          assignedDistricts={user.assignedDistricts}
          onLogout={handleLogout}
        />
      )

    case 'ADMIN':
    case 'SYSTEM_ADMIN':
      return (
        <AdminDashboard
          token={token}
          fullName={user.fullName}
          email={user.email}
          onLogout={handleLogout}
        />
      )

    case 'SHELTER_STAFF':
      return (
        <ShelterStaffDashboard
          fullName={user.fullName}
          email={user.email}
          district={user.district}
          onLogout={handleLogout}
        />
      )

    default:
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <section className="rounded-xl bg-white p-8 text-center shadow">
            <h1 className="text-xl font-bold text-slate-900">
              Access denied
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your account is not authorized for these dashboards.
            </p>
            <button
              onClick={handleLogout}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700"
            >
              Back to login
            </button>
          </section>
        </main>
      )
  }
}

export default App
