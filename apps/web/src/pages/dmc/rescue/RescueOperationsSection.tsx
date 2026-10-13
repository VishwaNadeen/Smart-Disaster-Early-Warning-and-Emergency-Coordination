import { useState } from 'react'
import { ClipboardList, Plus, ShieldCheck, Users } from 'lucide-react'
import RescueRequestsSection from './RescueRequestsSection'
import RescueTeamsSection from './RescueTeamsSection'

//  Separate incoming citizen requests from rescue-team management.
interface RescueOperationsSectionProps {
  token: string
  registeredDistrict?: string
  assignedDistricts?: string[]
  role?: string
}

type View = 'requests' | 'teams'

export default function RescueOperationsSection({
  token,
  registeredDistrict,
  assignedDistricts,
  role,
}: RescueOperationsSectionProps) {
  const [view, setView] = useState<View>('requests')
  const [openAddRequest, setOpenAddRequest] = useState(0)

  function handleAddTeam() {
    setView('teams')
    setOpenAddRequest(value => value + 1)
  }

  return (
    <section aria-label="Rescue operations" className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-teal-50 p-3 text-teal-700">
              <ShieldCheck size={25} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Rescue Operations</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review citizen help requests and coordinate rescue teams.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddTeam}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <Plus size={17} aria-hidden="true" />
            Add Rescue Team
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4" role="group" aria-label="Rescue operations views">
          <button
            type="button"
            aria-pressed={view === 'requests'}
            onClick={() => setView('requests')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${view === 'requests' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            <ClipboardList size={17} aria-hidden="true" />
            Help Requests
          </button>
          <button
            type="button"
            aria-pressed={view === 'teams'}
            onClick={() => setView('teams')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${view === 'teams' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            <Users size={17} aria-hidden="true" />
            Manage Rescue Teams
          </button>
        </div>
      </header>

      {view === 'requests' ? (
        <RescueRequestsSection token={token} />
      ) : (
        <RescueTeamsSection
          token={token}
          registeredDistrict={registeredDistrict}
          assignedDistricts={assignedDistricts}
          role={role}
          openAddRequest={openAddRequest}
        />
      )}
    </section>
  )
}
