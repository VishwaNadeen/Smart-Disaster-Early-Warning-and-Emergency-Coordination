import { vi } from 'vitest'
import type { DisasterReportItem } from '../pages/dmc/DisasterReportsSection'
import type {
  DeliveryRecord,
  HazardAlertItem,
} from '../pages/dmc/DisasterWarningsSection'

const API_BASE = 'http://localhost:3000/api'

export interface MockReply {
  status?: number
  body?: unknown
}

export type RouteHandler =
  | MockReply
  | ((request: { url: string; init?: RequestInit }) => MockReply)

export interface RecordedRequest {
  method: string
  path: string
  query: URLSearchParams
  body: unknown
  headers: Record<string, string>
}

/**
 * Replaces the global fetch with a router keyed by "METHOD /path".
 * Unmatched requests answer 404 so a missing mock fails loudly.
 */
export function installFetch(routes: Record<string, RouteHandler>) {
  const requests: RecordedRequest[] = []

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(String(input))
      const method = (init?.method ?? 'GET').toUpperCase()
      const path = url.pathname.replace(/^\/api/, '')
      const rawBody = typeof init?.body === 'string' ? init.body : undefined

      requests.push({
        method,
        path,
        query: url.searchParams,
        body: rawBody ? JSON.parse(rawBody) : init?.body,
        headers: (init?.headers ?? {}) as Record<string, string>,
      })

      const handler = routes[`${method} ${path}`]
      if (!handler) {
        return new Response(JSON.stringify({ message: `No mock for ${method} ${path}` }), {
          status: 404,
        })
      }

      const reply =
        typeof handler === 'function' ? handler({ url: String(input), init }) : handler
      return new Response(JSON.stringify(reply.body ?? {}), {
        status: reply.status ?? 200,
      })
    },
  )

  vi.stubGlobal('fetch', fetchMock)

  return {
    fetchMock,
    requests,
    to: (method: string, path: string) =>
      requests.filter((request) => request.method === method && request.path === path),
  }
}

export { API_BASE }

export function buildAlert(overrides: Partial<HazardAlertItem> = {}): HazardAlertItem {
  return {
    _id: 'alert-1',
    title: 'Flood warning - Kandy',
    message: 'River levels are rising.',
    safetyInstructions: 'Move to the nearest shelter.',
    hazardType: 'FLOOD',
    severity: 'WARNING',
    affectedDistricts: ['Kandy'],
    affectedCities: ['All Cities'],
    notificationChannels: ['SMS'],
    publishedBy: 'officer-1',
    status: 'PUBLISHED',
    publishedAt: '2026-10-13T01:00:00.000Z',
    ...overrides,
  }
}

export function buildReport(overrides: Partial<DisasterReportItem> = {}): DisasterReportItem {
  return {
    _id: 'report-1',
    reportNumber: 'RPT-2026-001',
    citizenId: 'citizen-1',
    citizenName: 'Nimal Perera',
    citizenPhone: '0771234567',
    hazardType: 'FLOOD',
    description: 'Water is entering houses near the bridge.',
    district: 'Kandy',
    city: 'Peradeniya',
    status: 'PENDING_VERIFICATION',
    submittedAt: '2026-10-13T00:30:00.000Z',
    ...overrides,
  }
}

export function buildDelivery(overrides: Partial<DeliveryRecord> = {}): DeliveryRecord {
  return {
    _id: 'delivery-1',
    recipientId: 'citizen-1',
    channel: 'SMS',
    status: 'SENT',
    sentAt: '2026-10-13T01:01:00.000Z',
    ...overrides,
  }
}
