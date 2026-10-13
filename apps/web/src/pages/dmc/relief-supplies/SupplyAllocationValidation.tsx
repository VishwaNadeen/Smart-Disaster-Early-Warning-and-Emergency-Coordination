import { AlertCircle, AlertTriangle } from 'lucide-react'

export interface SupplyAllocationIssue {
  type: 'MISMATCH' | 'INSUFFICIENT'
  title: string
  message: string
}

interface Props {
  issues: SupplyAllocationIssue[]
}

// REVIEW [Dead Code]: not imported anywhere - SupplyRequestReviewModal renders its own copy of this UI.
export default function SupplyAllocationValidation({ issues }: Props) {
  if (issues.length === 0) return null

  return (
    <div className="mt-4 space-y-3" aria-live="polite">
      {issues.map((issue, index) => {
        const isMismatch = issue.type === 'MISMATCH'

        return (
          <div
            key={`${issue.type}-${index}`}
            role="alert"
            className={`flex items-start gap-3 rounded-lg border p-4 ${
              isMismatch
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {isMismatch ? (
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
            )}

            <div>
              <p className="font-semibold">{issue.title}</p>
              <p className="mt-1 text-sm">{issue.message}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}