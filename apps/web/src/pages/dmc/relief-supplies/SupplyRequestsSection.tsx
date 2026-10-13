import { Boxes, Check, RefreshCw, X } from 'lucide-react'

import { getShelterName, humanize } from './api'
import type { ReviewDecision, Shelter, SupplyRequest } from './types'

interface Props {
  supplyRequests: SupplyRequest[]
  shelters: Shelter[]
  loading: boolean
  saving: boolean
  error: string
  onRetry: () => void
  onReview: (request: SupplyRequest, decision: ReviewDecision) => void
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'APPROVED' || status === 'ALLOCATED'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'PENDING' || status === 'PARTIALLY_ALLOCATED'
        ? 'bg-amber-50 text-amber-700'
        : status === 'REJECTED' || status === 'CANCELLED'
          ? 'bg-red-50 text-red-700'
          : 'bg-blue-50 text-blue-700'

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      {humanize(status)}
    </span>
  )
}

export default function SupplyRequestsSection({
  supplyRequests,
  shelters,
  loading,
  saving,
  error,
  onRetry,
  onReview,
}: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">Shelter supply requests</h3>
        <p className="mt-1 text-sm text-slate-500">
          Review requests submitted by staff at assigned shelters.
        </p>
      </div>

      {error && (
        <div role="alert" className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Unable to load supply requests</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md border border-red-200 bg-white px-3 py-2 font-semibold hover:bg-red-50"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <RefreshCw size={17} className="animate-spin" />
          Loading supply requests...
        </div>
      ) : supplyRequests.length === 0 ? (
        <div className="m-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
          <Boxes size={32} className="mx-auto text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">
            {error ? 'Requests could not be loaded.' : 'No shelter supply requests found.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Shelter</th>
                <th className="px-4 py-3">Requested item</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplyRequests.map((request) => (
                <tr key={request._id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    {getShelterName(request.shelterId, shelters)}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{request.itemName}</p>
                    <p className="mt-1 text-xs text-slate-500">{humanize(request.category)}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {request.requestedQuantity} {humanize(request.unit)}
                  </td>
                  <td className="max-w-xs whitespace-normal px-4 py-4">{request.reason}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                    {request.createdAt ? new Date(request.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-4">
                    {request.status === 'PENDING' ? (
                      <div className="flex min-w-[230px] flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => onReview(request, 'APPROVED')}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Check size={14} /> Approve &amp; Allocate
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => onReview(request, 'REJECTED')}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
