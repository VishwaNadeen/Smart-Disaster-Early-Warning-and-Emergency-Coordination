import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import AssignRescueTeamModal from '../rescue/AssignRescueTeamModal'
import { getRescueRequests, updateRescueRequestStatus, type HelpRequestStatus, type RescueRequest } from '../rescue/rescueAssignmentApi'

//  DMC queue for help requests submitted by citizens.
interface RescueRequestsSectionProps { token: string }
const statuses: HelpRequestStatus[] = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED']

export default function RescueRequestsSection({ token }: RescueRequestsSectionProps) {
  const [requests, setRequests] = useState<RescueRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState<'ALL' | HelpRequestStatus>('ALL')
  const [selected, setSelected] = useState<RescueRequest | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const data = await getRescueRequests(token, signal)
      if (!signal?.aborted) setRequests(data)
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Failed to load help requests')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  const visible = useMemo(() => requests.filter(request => filter === 'ALL' || request.status === filter), [requests, filter])
  const pending = requests.filter(request => request.status === 'PENDING').length

  async function changeStatus(request: RescueRequest, status: HelpRequestStatus) {
    setBusyId(request._id)
    setError('')
    setNotice('')
    try {
      await updateRescueRequestStatus(token, request._id, status)
      setNotice(`${request.requestNumber} updated to ${status.replaceAll('_', ' ')}.`)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section aria-label="Citizen help requests" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Citizen Emergency Help Requests</h2>
          <p className="mt-1 text-sm text-slate-600">{pending} pending · {requests.length} total requests</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="request-status-filter" className="text-sm text-slate-600">Status</label>
          <select id="request-status-filter" value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="ALL">All</option>
            {statuses.map(status => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
          </select>
          <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button>
        </div>
      </div>
      {error && <p role="alert" className="m-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} />{error}</p>}
      {notice && <p role="status" className="m-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{notice}</p>}
      {loading ? <p className="p-6 text-sm text-slate-500">Loading citizen help requests...</p> : visible.length === 0 ? <p className="p-6 text-sm text-slate-500">No help requests found for this status.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>
              <th className="px-4 py-3">Request / Citizen</th><th className="px-4 py-3">Help needed</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Urgency</th><th className="px-4 py-3">Status / Team</th><th className="px-4 py-3">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map(request => <tr key={request._id} className="align-top">
                <td className="px-4 py-4"><strong className="block text-slate-900">{request.requestNumber}</strong><span className="block">{request.citizenName}</span><span className="block text-xs text-slate-500">{request.citizenPhone}</span><span className="block text-xs text-slate-500">{request.submittedAt ? new Date(request.submittedAt).toLocaleString() : ''}</span></td>
                <td className="max-w-xs px-4 py-4 text-slate-700">{request.description}</td>
                <td className="px-4 py-4"><span className="block">{[request.city, request.district].filter(Boolean).join(', ') || 'Not specified'}</span><span className="block text-xs text-slate-500">{request.locationDescription}</span>{request.latitude !== undefined && request.longitude !== undefined && <a className="text-xs text-teal-700 underline" href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`} target="_blank" rel="noreferrer">View GPS</a>}</td>
                <td className="px-4 py-4 font-semibold">{request.urgency}</td>
                <td className="px-4 py-4"><span className="block font-semibold">{request.status.replaceAll('_', ' ')}</span><span className="block text-xs text-slate-500">{request.assignedTeamName || 'Not assigned'}</span></td>
                <td className="px-4 py-4">
                  <div className="flex flex-col items-start gap-2">
                    {request.status === 'PENDING' && <button type="button" onClick={() => setSelected(request)} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white">Assign Team</button>}
                    {request.status === 'ASSIGNED' && <button type="button" disabled={busyId === request._id} onClick={() => void changeStatus(request, 'IN_PROGRESS')} className="rounded-lg border border-teal-700 px-3 py-2 text-xs font-semibold text-teal-800">Start Rescue</button>}
                    {request.status === 'IN_PROGRESS' && <button type="button" disabled={busyId === request._id} onClick={() => void changeStatus(request, 'RESOLVED')} className="rounded-lg border border-teal-700 px-3 py-2 text-xs font-semibold text-teal-800">Mark Resolved</button>}
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
      {selected && <AssignRescueTeamModal token={token} request={selected} onClose={() => setSelected(null)} onAssigned={() => { setSelected(null); setNotice('Rescue team assigned successfully.'); void refresh() }} />}
    </section>
  )
}
