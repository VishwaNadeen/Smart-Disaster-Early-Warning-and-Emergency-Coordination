import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DmcDashboard from '../pages/dmc/DmcDashboard'
import { buildReport, installFetch, type RouteHandler } from './helpers'

// Only the dashboard shell is under test, so every heavy child page is replaced by a marker.
vi.mock('../pages/dmc/ShelterMap', () => ({ default: () => <div data-testid="shelter-map" /> }))
vi.mock('../pages/dmc/CreateShelterForm', () => ({ default: () => null }))
vi.mock('../pages/dmc/EditShelterForm', () => ({ default: () => null }))
vi.mock('../pages/dmc/ReliefSuppliesPage', () => ({ default: () => null }))
vi.mock('../pages/dmc/RescueTeamsSection', () => ({ default: () => null }))
vi.mock('../pages/dmc/DisasterReportsSection', () => ({
  default: () => <div data-testid="reports-page">Reports page</div>,
}))
vi.mock('../pages/dmc/DisasterWarningsSection', () => ({
  default: () => <div data-testid="warnings-page">Warnings page</div>,
}))

const POLL_MS = 15000

function setup(initialReports = [buildReport()], extra: Record<string, RouteHandler> = {}) {
  let reports = initialReports
  const api = installFetch({
    'GET /reports': () => ({ body: { data: reports } }),
    'GET /hazard-alerts': { body: { data: [{ status: 'PUBLISHED' }, { status: 'PUBLISHED' }] } },
    'GET /rescue-teams': { body: { data: [{}, {}, {}] } },
    'GET /shelters': { body: { data: [] } },
    ...extra,
  })
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  render(
    <DmcDashboard
      token="officer-token"
      fullName="Vishwa Nadeen"
      email="officer@dmc.lk"
      role="DUTY_OFFICER"
      district="Kandy"
      onLogout={vi.fn()}
    />,
  )
  return {
    ...api,
    user: userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime }),
    setReports: (next: typeof initialReports) => {
      reports = next
    },
    nextPoll: () =>
      act(async () => {
        vi.advanceTimersByTime(POLL_MS)
      }),
  }
}

const sidebarButton = (name: string) =>
  within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(name) })

describe('DmcDashboard - new citizen report notice', () => {
  it('does not announce reports that were already waiting when the officer opened the portal', async () => {
    setup()

    await waitFor(() => expect(sidebarButton('Disaster Reports')).toHaveTextContent('1'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a notice when a new citizen report arrives', async () => {
    const api = setup()
    await waitFor(() => expect(sidebarButton('Disaster Reports')).toHaveTextContent('1'))

    api.setReports([
      buildReport(),
      buildReport({ _id: 'report-9', reportNumber: 'RPT-2026-009', hazardType: 'LANDSLIDE', city: 'Gampola' }),
    ])
    await api.nextPoll()

    const notice = await screen.findByRole('alert')
    expect(within(notice).getByText('New citizen report received')).toBeInTheDocument()
    expect(within(notice).getByText(/RPT-2026-009 · landslide · Gampola, Kandy/)).toBeInTheDocument()
    expect(sidebarButton('Disaster Reports')).toHaveTextContent('2')
  })

  it('says how many reports arrived together', async () => {
    const api = setup()
    await waitFor(() => expect(sidebarButton('Disaster Reports')).toHaveTextContent('1'))

    api.setReports([
      buildReport(),
      buildReport({ _id: 'a', reportNumber: 'RPT-A' }),
      buildReport({ _id: 'b', reportNumber: 'RPT-B' }),
    ])
    await api.nextPoll()

    expect(await screen.findByText('2 new citizen reports received')).toBeInTheDocument()
  })

  it('does not repeat the notice for a report that was already announced', async () => {
    const api = setup()
    await waitFor(() => expect(sidebarButton('Disaster Reports')).toHaveTextContent('1'))
    api.setReports([buildReport(), buildReport({ _id: 'a', reportNumber: 'RPT-A' })])
    await api.nextPoll()
    await screen.findByRole('alert')
    await api.user.click(screen.getByRole('button', { name: 'Dismiss' }))

    await api.nextPoll()
    await waitFor(() => expect(api.to('GET', '/reports').length).toBeGreaterThanOrEqual(3))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ignores reports that are not waiting for verification', async () => {
    const api = setup()
    await waitFor(() => expect(sidebarButton('Disaster Reports')).toHaveTextContent('1'))

    api.setReports([buildReport(), buildReport({ _id: 'v', reportNumber: 'RPT-V', status: 'VERIFIED' })])
    await api.nextPoll()
    await waitFor(() => expect(api.to('GET', '/reports')).toHaveLength(2))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('opens the reports page from the notice', async () => {
    const api = setup()
    await waitFor(() => expect(sidebarButton('Disaster Reports')).toHaveTextContent('1'))
    api.setReports([buildReport(), buildReport({ _id: 'a', reportNumber: 'RPT-A' })])
    await api.nextPoll()

    await api.user.click(await screen.findByRole('button', { name: 'Review report' }))

    expect(screen.getByTestId('reports-page')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('dismisses the notice without leaving the current page', async () => {
    const api = setup()
    await waitFor(() => expect(sidebarButton('Disaster Reports')).toHaveTextContent('1'))
    api.setReports([buildReport(), buildReport({ _id: 'a', reportNumber: 'RPT-A' })])
    await api.nextPoll()

    await api.user.click(await screen.findByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByTestId('reports-page')).not.toBeInTheDocument()
  })

  it('keeps polling after a failed request', async () => {
    const api = setup()
    await waitFor(() => expect(sidebarButton('Disaster Reports')).toHaveTextContent('1'))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await api.nextPoll()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(sidebarButton('Disaster Reports')).toHaveTextContent('1')
  })

  it('scopes the check to the officer district and sends the token', async () => {
    const api = setup()
    await waitFor(() => expect(sidebarButton('Disaster Reports')).toHaveTextContent('1'))

    const request = api.to('GET', '/reports')[0]
    expect(request.query.get('district')).toBe('Kandy')
    expect(request.headers.Authorization).toBe('Bearer officer-token')
  })
})

describe('DmcDashboard - sidebar', () => {
  it('shows the active alert and rescue team counts', async () => {
    setup()

    await waitFor(() => expect(sidebarButton('Warning Alerts')).toHaveTextContent('2'))
    await waitFor(() => expect(sidebarButton('Rescue Teams')).toHaveTextContent('3'))
  })

  it('navigates between pages from the sidebar', async () => {
    const api = setup()

    await api.user.click(sidebarButton('Warning Alerts'))
    expect(screen.getByTestId('warnings-page')).toBeInTheDocument()

    await api.user.click(sidebarButton('Disaster Reports'))
    expect(screen.getByTestId('reports-page')).toBeInTheDocument()
  })
})
