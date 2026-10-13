import { AlertCircle, Check, RefreshCw, X } from 'lucide-react'

type SupplyForValidation = {
  name: string
  category: string
  unit: string
  availableQuantity: number
}

type RequestForReview = {
  _id: string
  itemName: string
  category: string
  unit: string
  requestedQuantity: number
  reason: string
}

type AllocationIssue = {
  type: 'MISMATCH' | 'INSUFFICIENT'
  title: string
  message: string
}

interface Props {
  request: RequestForReview
  decision: 'APPROVED' | 'REJECTED'
  shelterName: string
  supplies: SupplyForValidation[]
  notes: string
  saving: boolean
  error: string
  onNotesChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

// REVIEW [Duplication across layers]: mirrors the backend matching rule in reviewRequest() but normalizes names differently - the two can disagree.
function getAllocationIssues(
  request: RequestForReview,
  supplies: SupplyForValidation[],
): AllocationIssue[] {
  const normalize = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

  const sameName = supplies.filter(
    (supply) => normalize(supply.name) === normalize(request.itemName),
  )
  const matching = sameName.find(
    (supply) =>
      supply.category === request.category && supply.unit === request.unit,
  )

  if (!matching) {
    return [{
      type: 'MISMATCH',
      title: 'Stock item mismatch',
      message: sameName.length
        ? `The inventory item "${request.itemName}" exists, but its category or unit does not match the request. Verify the inventory item before approving.`
        : `No matching stock item was found for "${request.itemName}". Check the item name, category, and unit before approving this request.`,
    }]
  }

  const available = Number(matching.availableQuantity)
  const requested = Number(request.requestedQuantity)
  if (available < requested) {
    const shortage = requested - available
    return [{
      type: 'INSUFFICIENT',
      title: 'Insufficient stock',
      message: `Requested: ${requested} ${humanize(request.unit).toLowerCase()}. Available: ${available} ${humanize(matching.unit).toLowerCase()}. Shortfall: ${shortage} ${humanize(request.unit).toLowerCase()}.`,
    }]
  }

  return []
}

export default function SupplyRequestReviewModal({
  request,
  decision,
  shelterName,
  supplies,
  notes,
  saving,
  error,
  onNotesChange,
  onClose,
  onConfirm,
}: Props) {
  const issues = decision === 'APPROVED'
    ? getAllocationIssues(request, supplies)
    : []
  const approvalBlocked = decision === 'APPROVED' && issues.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-dialog-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            decision === 'APPROVED'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {decision === 'APPROVED' ? <Check size={22} /> : <X size={22} />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="review-dialog-title" className="text-lg font-bold text-slate-900">
              {decision === 'APPROVED' ? 'Approve & Allocate Supplies' : 'Reject Supply Request'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {decision === 'APPROVED'
                ? 'Review the request details before confirming. Available inventory will be used for the allocation.'
                : 'Please confirm that you want to reject this shelter supply request.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close confirmation"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">
          <Detail label="Shelter" value={shelterName} />
          <Detail label="Requested item" value={request.itemName} />
          <Detail label="Category" value={humanize(request.category)} />
          <Detail label="Requested quantity" value={`${request.requestedQuantity} ${humanize(request.unit)}`} />
          <div className="border-t border-slate-200 pt-3 text-sm">
            <p className="text-slate-500">Reason</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">
              {request.reason || 'No reason provided.'}
            </p>
          </div>
        </div>

        {/* REVIEW [DRY]: this markup duplicates SupplyAllocationValidation.tsx, which is never used - render that component or delete it. */}
        {issues.map((issue, index) => (
          <div
            key={`${issue.type}-${index}`}
            role="alert"
            aria-live="polite"
            className={`mt-4 flex items-start gap-3 rounded-lg border p-4 ${
              issue.type === 'MISMATCH'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{issue.title}</p>
              <p className="mt-1 text-sm">{issue.message}</p>
            </div>
          </div>
        ))}

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">
            {decision === 'APPROVED' ? 'Decision notes (optional)' : 'Rejection reason (optional)'}
          </span>
          <textarea
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder={decision === 'APPROVED' ? 'Add allocation notes if needed...' : 'Explain why this request is being rejected...'}
            className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || approvalBlocked}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              decision === 'APPROVED'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : decision === 'APPROVED' ? <Check size={16} /> : <X size={16} />}
            {saving ? 'Processing...' : decision === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
          </button>
        </div>
      </section>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  )
}
