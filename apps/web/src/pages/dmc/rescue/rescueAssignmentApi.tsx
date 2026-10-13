// [SE3070 - MODIFIED] Use the citizen Help Requests API and its real DTOs.
const API_URL = 'http://localhost:3000/api'

export type HelpRequestStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED'
export type HelpRequestUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface RescueRequest {
  _id: string
  requestNumber: string
  citizenId: string
  citizenName: string
  citizenEmail: string
  citizenPhone: string
  description: string
  urgency: HelpRequestUrgency
  latitude?: number
  longitude?: number
  locationDescription?: string
  district?: string
  city?: string
  status: HelpRequestStatus
  assignedTeamId?: string
  assignedTeamName?: string
  assignedAt?: string
  officerNotes?: string
  submittedAt: string
}

export interface RescueTeam {
  _id: string
  teamId: string
  teamName: string
  teamType: string
  memberCount: number
  district?: string
  status: 'AVAILABLE' | 'STANDBY' | 'DEPLOYED' | 'OFF_DUTY'
}

export class RescueAssignmentApiError extends Error {
  public readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'RescueAssignmentApiError'
    this.status = status
  }
}

async function apiRequest<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload
      ? (payload as { message: string | string[] }).message
      : `Request failed (${response.status})`
    throw new RescueAssignmentApiError(Array.isArray(message) ? message.join(', ') : String(message), response.status)
  }
  return payload as T
}

type ListResponse<T> = { data: T[]; success?: boolean }
type ItemResponse<T> = { data: T; success?: boolean; message?: string }

//  Citizen submissions are stored as help-requests.
export async function getRescueRequests(token: string, signal?: AbortSignal): Promise<RescueRequest[]> {
  const result = await apiRequest<ListResponse<RescueRequest> | RescueRequest[]>(token, '/help-requests', { signal })
  return Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : []
}

// Reuse the existing rescue-team directory endpoint.
export async function getAvailableTeams(token: string, signal?: AbortSignal): Promise<RescueTeam[]> {
  const result = await apiRequest<ListResponse<RescueTeam> | RescueTeam[]>(token, '/rescue-teams', { signal })
  const teams = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : []
  return teams.filter(team => team.status === 'AVAILABLE' || team.status === 'STANDBY')
}

//  Matches AssignHelpRequestDto { teamId, officerNotes? }.
export async function assignRescueTeam(
  token: string,
  input: { requestId: string; teamId: string; officerNotes?: string },
): Promise<RescueRequest> {
  const result = await apiRequest<ItemResponse<RescueRequest>>(
    token, `/help-requests/${encodeURIComponent(input.requestId)}/assign`,
    { method: 'PATCH', body: JSON.stringify({ teamId: input.teamId, officerNotes: input.officerNotes || undefined }) },
  )
  return result.data
}

// Matches UpdateHelpRequestStatusDto.
export async function updateRescueRequestStatus(
  token: string,
  requestId: string,
  status: HelpRequestStatus,
  officerNotes?: string,
): Promise<RescueRequest> {
  const result = await apiRequest<ItemResponse<RescueRequest>>(
    token, `/help-requests/${encodeURIComponent(requestId)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status, ...(officerNotes === undefined ? {} : { officerNotes }) }) },
  )
  return result.data
}
