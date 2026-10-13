
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import {
  AlertCircle,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react'

import {
  assignRescueTeam,
  getAvailableTeams,
  type RescueRequest,
  type RescueTeam,
} from './rescueAssignmentApi'

// [SE3070 - ADDED] Assignment modal properties
interface AssignRescueTeamModalProps {
  token: string
  request: RescueRequest
  onClose: () => void
  onAssigned: () => void
}

// [SE3070 - ADDED] Rescue team type labels
const TEAM_TYPES: Record<string, string> = {
  ARMY: 'Sri Lanka Army',
  NAVY: 'Sri Lanka Navy',
  AIR_FORCE: 'Sri Lanka Air Force',
  POLICE: 'Police / STF',
  FIRE_RESCUE: 'Fire & Rescue',
  COAST_GUARD: 'Coast Guard',
  MEDICAL_EMT: 'Medical / EMT',
  DISASTER_RELIEF: 'Disaster Relief',
  OTHER: 'Other',
}

// [SE3070 - ADDED] Validate team availability
const isTeamAvailable = (team: RescueTeam): boolean => {
  return (
    team.status === 'AVAILABLE' ||
    team.status === 'STANDBY'
  )
}

// [SE3070 - ADDED] Validate district eligibility
const isDistrictEligible = (
  team: RescueTeam,
  request: RescueRequest,
): boolean => {
  if (!request.district || !team.district) {
    return true
  }

  return (
    team.district.trim().toLowerCase() ===
    request.district.trim().toLowerCase()
  )
}

export default function AssignRescueTeamModal({
  token,
  request,
  onClose,
  onAssigned,
}: AssignRescueTeamModalProps) {
  const [teams, setTeams] = useState<RescueTeam[]>([])

  const [selectedType, setSelectedType] = useState('ALL')
  const [teamId, setTeamId] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')

  // [SE3070 - MODIFIED]
  // Load available rescue teams from the backend.
  useEffect(() => {
    const controller = new AbortController()

    async function loadTeams() {
      setLoading(true)
      setError('')

      try {
        const data = await getAvailableTeams(
          token,
          controller.signal,
        )

        if (!controller.signal.aborted) {
          setTeams(data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load rescue teams.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadTeams()

    return () => controller.abort()
  }, [token])

  // [SE3070 - ADDED]
  // Only eligible rescue teams can be assigned.
  const eligibleTeams = useMemo(() => {
    return teams.filter(
      (team) =>
        isTeamAvailable(team) &&
        isDistrictEligible(team, request),
    )
  }, [teams, request])

  // [SE3070 - ADDED]
  // Extract rescue team types from eligible teams.
  const availableTypes = useMemo(() => {
    const types = new Set(
      eligibleTeams.map((team) => team.teamType),
    )

    return Array.from(types).sort()
  }, [eligibleTeams])

  // [SE3070 - ADDED]
  // Filter eligible rescue teams by selected type.
  const filteredTeams = useMemo(() => {
    if (selectedType === 'ALL') {
      return eligibleTeams
    }

    return eligibleTeams.filter(
      (team) => team.teamType === selectedType,
    )
  }, [eligibleTeams, selectedType])

  // [SE3070 - ADDED]
  // Validate assignment before submitting.
  const validateAssignment = (): boolean => {
    if (!teamId) {
      setFieldError('Please select a rescue team.')
      return false
    }

    const selectedTeam = eligibleTeams.find(
      (team) => team._id === teamId,
    )

    if (!selectedTeam) {
      setFieldError(
        'The selected rescue team is not available.',
      )
      return false
    }

    if (notes.trim().length > 1000) {
      setFieldError(
        'Officer notes cannot exceed 1000 characters.',
      )
      return false
    }

    setFieldError('')
    return true
  }

  // [SE3070 - MODIFIED]
  // Submit rescue team assignment.
  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (saving || loading) {
      return
    }

    if (!validateAssignment()) {
      return
    }

    setSaving(true)
    setError('')

    try {
      await assignRescueTeam(token, {
        requestId: request._id,
        teamId,
        officerNotes: notes.trim() || undefined,
      })

      onAssigned()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to assign rescue team.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        {/* Modal header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-100 p-3 text-teal-700">
              <ShieldCheck size={22} />
            </div>

            <div>
              <h2
                id="assign-title"
                className="text-lg font-bold text-slate-900"
              >
                Assign Rescue Team
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {request.requestNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close assignment modal"
            className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Citizen help request details */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <strong>Citizen:</strong>{' '}
            {request.citizenName || 'Not specified'}
          </p>

          <p className="mt-2">
            <strong>Urgency:</strong>{' '}
            {request.urgency}
          </p>

          <p className="mt-2">
            <strong>Help needed:</strong>{' '}
            {request.description}
          </p>

          <p className="mt-2">
            <strong>District:</strong>{' '}
            {request.district || 'Not specified'}
          </p>

          <p className="mt-2">
            <strong>Location:</strong>{' '}
            {[
              request.locationDescription,
              request.city,
              request.district,
            ]
              .filter(Boolean)
              .join(', ') || 'GPS location only'}
          </p>
        </div>

        {/* Assignment form */}
        <form
          onSubmit={submit}
          className="mt-5 space-y-4"
        >
          {/* Rescue team type filter */}
          <div>
            <label
              htmlFor="rescue-team-type"
              className="block text-sm font-semibold text-slate-700"
            >
              Rescue Team Type
            </label>

            <select
              id="rescue-team-type"
              value={selectedType}
              onChange={(event) => {
                setSelectedType(event.target.value)
                setTeamId('')
                setFieldError('')
              }}
              disabled={loading || saving}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-teal-500 disabled:opacity-50"
            >
              <option value="ALL">
                All Rescue Team Types
              </option>

              {availableTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {TEAM_TYPES[type] || type}
                </option>
              ))}
            </select>
          </div>

          {/* Available rescue team dropdown */}
          <div>
            <label
              htmlFor="assign-team"
              className="block text-sm font-semibold text-slate-700"
            >
              Available / Standby Rescue Team
              <span className="ml-1 text-red-600">*</span>
            </label>

            {loading ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Loading rescue teams...
              </p>
            ) : (
              <select
                id="assign-team"
                value={teamId}
                onChange={(event) => {
                  setTeamId(event.target.value)
                  setFieldError('')
                }}
                required
                disabled={
                  saving ||
                  filteredTeams.length === 0
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-teal-500 disabled:opacity-50"
              >
                <option value="">
                  Select Rescue Team
                </option>

                {filteredTeams.map((team) => (
                  <option
                    key={team._id}
                    value={team._id}
                  >
                    {team.teamName} ({team.teamId})
                    {' - '}
                    {team.status}
                    {' - '}
                    {team.district || 'All Districts'}
                  </option>
                ))}
              </select>
            )}

            {!loading &&
              filteredTeams.length === 0 &&
              !error && (
                <p className="mt-2 text-sm text-amber-700">
                  No eligible rescue teams found
                  for the selected type and district.
                </p>
              )}

            {fieldError && (
              <p
                role="alert"
                className="mt-2 text-sm text-red-600"
              >
                {fieldError}
              </p>
            )}
          </div>

          {/* Officer notes */}
          <div>
            <label
              htmlFor="officer-notes"
              className="block text-sm font-semibold text-slate-700"
            >
              Officer Notes (Optional)
            </label>

            <textarea
              id="officer-notes"
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              disabled={saving}
              placeholder="Add instructions for the rescue team..."
              className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-teal-500 disabled:opacity-50"
            />

            <p className="mt-1 text-right text-xs text-slate-500">
              {notes.length}/1000
            </p>
          </div>

          {/* API error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle
                size={17}
                className="shrink-0"
              />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                loading ||
                !teamId
              }
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {saving
                ? 'Assigning...'
                : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
