import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DisasterReportsSection from '../pages/dmc/DisasterReportsSection'
import { buildReport, installFetch, type RouteHandler } from './helpers'

vi.mock('react-leaflet', async () => (await import('./reactLeafletMock')).reactLeafletMock)

const PENDING = buildReport()
const VERIFIED = buildReport({
  _id: 'report-2',
  reportNumber: 'RPT-2026-002',
  status: 'VERIFIED',
  hazardType: 'LANDSLIDE',
  city: 'Gampola',
  officerNotes: 'Confirmed by field team',
})
const REJECTED = buildReport({
  _id: 'report-3',
  reportNumber: 'RPT-2026-003',
  status: 'REJECTED',
  hazardType: 'FIRE',
  rejectionReason: 'Duplicate of RPT-2026-001',
})

function setup(
  options: {
    reports?: ReturnType<typeof buildReport>[]
    routes?: Record<string, RouteHandler>
    props?: Partial<Parameters<typeof DisasterReportsSection>[0]>
  } = {},
) {
  const api = installFetch({
    'GET /reports/districts': { body: { data: ['Kandy', 'Galle'] } },
    'GET /reports': { body: { data: options.reports ?? [PENDING, VERIFIED, REJECTED] } },
    ...options.routes,
  })
  const onIssueAlertFromReport = vi.fn()
  const onPendingCountChange = vi.fn()
  render(
    <DisasterReportsSection
      token="test-token"
      onIssueAlertFromReport={onIssueAlertFromReport}
      onPendingCountChange={onPendingCountChange}
      {...options.props}
    />,
  )
  return { ...api, onIssueAlertFromReport, onPendingCountChange, user: userEvent.setup({ delay: null }) }
}

const rowOf = (reportNumber: string) => screen.getByText(reportNumber).closest('li')!

const reviewDialog = (reportNumber = 'RPT-2026-001') =>
  within(screen.getByRole('heading', { name: `Report ${reportNumber}` }).closest('div.flex-col') as HTMLElement)

async function openReview(user: ReturnType<typeof userEvent.setup>, reportNumber = 'RPT-2026-001') {
  await screen.findByText(reportNumber)
  const label = rowOf(reportNumber).textContent?.includes('Pending') ? 'Review' : 'View'
  await user.click(within(rowOf(reportNumber)).getByRole('button', { name: label }))
  await screen.findByRole('heading', { name: `Report ${reportNumber}` })
}

describe('DisasterReportsSection - report list', () => {
  it('loads reports with the officer token and reports the pending count', async () => {
    const { requests, onPendingCountChange } = setup()

    expect(await screen.findByText('RPT-2026-001')).toBeInTheDocument()
    expect(requests.find((r) => r.path === '/reports')!.headers.Authorization).toBe('Bearer test-token')
    expect(screen.getByText('1 pending verification')).toBeInTheDocument()
    expect(onPendingCountChange).toHaveBeenCalledWith(1)
  })

  it('limits the request to the registered district when there is one', async () => {
    const { requests } = setup({ props: { registeredDistrict: 'Kandy' } })
    await screen.findByText('RPT-2026-001')

    expect(requests.find((r) => r.path === '/reports')!.query.get('district')).toBe('Kandy')
  })

  it('asks for every district when none is registered', async () => {
    const { requests } = setup()
    await screen.findByText('RPT-2026-001')

    expect(requests.find((r) => r.path === '/reports')!.query.has('district')).toBe(false)
  })

  it('shows status, hazard, location and reporter on each row', async () => {
    setup()
    await screen.findByText('RPT-2026-001')

    const row = rowOf('RPT-2026-001')
    expect(within(row).getByText('Pending')).toBeInTheDocument()
    expect(within(row).getByText('Flood')).toBeInTheDocument()
    expect(within(row).getByText('Peradeniya, Kandy')).toBeInTheDocument()
    expect(within(row).getByText(/Nimal Perera/)).toBeInTheDocument()
  })

  it('uses a placeholder when a report has no location', async () => {
    setup({ reports: [buildReport({ city: undefined, district: undefined })] })

    expect(await screen.findByText('Location not provided')).toBeInTheDocument()
  })

  it('shows the custom name of an "Other" hazard', async () => {
    setup({ reports: [buildReport({ hazardType: 'OTHER', customHazardType: 'Chemical spill' })] })

    expect(await screen.findByText('Chemical spill')).toBeInTheDocument()
  })

  it('flags possible duplicates', async () => {
    setup({ reports: [buildReport({ possibleDuplicate: true })] })

    expect(await screen.findByText('Possible duplicate')).toBeInTheDocument()
  })

  it('offers Review for pending reports and View for the rest', async () => {
    setup()
    await screen.findByText('RPT-2026-001')

    expect(within(rowOf('RPT-2026-001')).getByRole('button', { name: 'Review' })).toBeInTheDocument()
    expect(within(rowOf('RPT-2026-002')).getByRole('button', { name: 'View' })).toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    setup({ reports: [] })

    expect(await screen.findByText('No reports match the current filters.')).toBeInTheDocument()
  })

  it('shows the server message when reports cannot be loaded', async () => {
    setup({ routes: { 'GET /reports': { status: 500, body: { message: 'Database unavailable' } } } })

    expect(await screen.findByText('Database unavailable')).toBeInTheDocument()
  })

  it('falls back to a generic message when the response has no message', async () => {
    setup({ routes: { 'GET /reports': { status: 500, body: {} } } })

    expect(await screen.findByText('Failed to load reports (HTTP 500)')).toBeInTheDocument()
  })

  it('accepts a plain array response', async () => {
    setup({ routes: { 'GET /reports': { body: [PENDING] } } })

    expect(await screen.findByText('RPT-2026-001')).toBeInTheDocument()
  })

  it('refreshes automatically every 15 seconds', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const { to } = setup()
    await screen.findByText('RPT-2026-001')
    expect(to('GET', '/reports')).toHaveLength(1)

    await act(async () => {
      vi.advanceTimersByTime(15000)
    })

    await waitFor(() => expect(to('GET', '/reports')).toHaveLength(2))
  })
})

describe('DisasterReportsSection - filtering', () => {
  it('shows a count on every status tab', async () => {
    setup()
    await screen.findByText('RPT-2026-001')

    expect(screen.getByRole('button', { name: /^All 3$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Pending 1$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Verified 1$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Rejected 1$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Needs info 0$/ })).toBeInTheDocument()
  })

  it('filters by status tab', async () => {
    const { user } = setup()
    await screen.findByText('RPT-2026-001')

    await user.click(screen.getByRole('button', { name: /^Verified/ }))

    expect(screen.getByText('RPT-2026-002')).toBeInTheDocument()
    expect(screen.queryByText('RPT-2026-001')).not.toBeInTheDocument()
  })

  it('filters by hazard type', async () => {
    const { user } = setup()
    await screen.findByText('RPT-2026-001')

    await user.click(screen.getByRole('button', { name: 'Filter by hazard' }))
    await user.click(screen.getByRole('button', { name: 'Fire' }))

    expect(screen.getByText('RPT-2026-003')).toBeInTheDocument()
    expect(screen.queryByText('RPT-2026-002')).not.toBeInTheDocument()
  })

  it('searches by report number, location and citizen name', async () => {
    const { user } = setup()
    await screen.findByText('RPT-2026-001')
    const search = screen.getByPlaceholderText('Search by report number, location or citizen')

    await user.type(search, 'gampola')
    expect(screen.getByText('RPT-2026-002')).toBeInTheDocument()
    expect(screen.queryByText('RPT-2026-001')).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'RPT-2026-003')
    expect(screen.getByText('RPT-2026-003')).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'nimal')
    expect(screen.getAllByText(/Nimal Perera/)).toHaveLength(3)
  })

  it('reloads reports when another district is chosen', async () => {
    const { user, requests } = setup()
    await screen.findByText('RPT-2026-001')

    await user.click(screen.getByRole('button', { name: 'Filter by district' }))
    await user.click(screen.getByRole('button', { name: 'Galle' }))

    await waitFor(() => expect(requests.some((r) => r.query.get('district') === 'Galle')).toBe(true))
  })
})

describe('DisasterReportsSection - reviewing a report (verification flow)', () => {
  it('shows the report details, reporter and location', async () => {
    const { user } = setup()
    await openReview(user)

    const dialog = screen.getByRole('heading', { name: 'Report RPT-2026-001' }).closest('div.flex-col')! as HTMLElement
    expect(within(dialog).getByText('Water is entering houses near the bridge.')).toBeInTheDocument()
    expect(within(dialog).getByText(/Nimal Perera · 0771234567/)).toBeInTheDocument()
    expect(within(dialog).getByText('Peradeniya, Kandy')).toBeInTheDocument()
  })

  it('shows a map and coordinates when the report has a GPS position', async () => {
    const { user } = setup({ reports: [buildReport({ latitude: 7.26, longitude: 80.59 })] })
    await openReview(user)

    expect(screen.getByTestId('map')).toBeInTheDocument()
    expect(screen.getByTestId('marker')).toHaveAttribute('data-position', '7.26,80.59')
    expect(screen.getByText('7.26000, 80.59000')).toBeInTheDocument()
  })

  it('says so when the report has no GPS position', async () => {
    const { user } = setup()
    await openReview(user)

    expect(screen.getByText('This report has no GPS coordinates.')).toBeInTheDocument()
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  })

  it('verifies a report, reloads the list and offers to issue an alert', async () => {
    const { user, to, onIssueAlertFromReport } = setup({
      routes: { 'PATCH /reports/report-1/status': { body: { success: true } } },
    })
    await openReview(user)

    await user.type(screen.getByLabelText('Officer notes'), 'Confirmed with the GN officer')
    await user.click(screen.getByRole('button', { name: 'Save decision' }))

    expect(await screen.findByText('Report verified. You can now issue an alert for this area.')).toBeInTheDocument()
    expect(to('PATCH', '/reports/report-1/status')[0].body).toEqual({
      status: 'VERIFIED',
      officerNotes: 'Confirmed with the GN officer',
    })
    await waitFor(() => expect(to('GET', '/reports')).toHaveLength(2))
    expect(screen.queryByRole('button', { name: 'Save decision' })).not.toBeInTheDocument()

    await user.click(reviewDialog().getByRole('button', { name: 'Issue Alert' }))

    expect(onIssueAlertFromReport).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'report-1', status: 'VERIFIED' }),
    )
    expect(screen.queryByRole('heading', { name: 'Report RPT-2026-001' })).not.toBeInTheDocument()
  })

  it('records "needs more info" without offering to issue an alert', async () => {
    const { user, to } = setup({
      routes: { 'PATCH /reports/report-1/status': { body: { success: true } } },
    })
    await openReview(user)

    await user.click(screen.getByRole('button', { name: 'Needs more info' }))
    await user.click(screen.getByRole('button', { name: 'Save decision' }))

    expect(await screen.findByText('Decision saved.')).toBeInTheDocument()
    expect(to('PATCH', '/reports/report-1/status')[0].body).toMatchObject({ status: 'NEEDS_MORE_INFO' })
    expect(reviewDialog().queryByRole('button', { name: 'Issue Alert' })).not.toBeInTheDocument()
  })

  it('requires a reason before rejecting', async () => {
    const { user, to } = setup()
    await openReview(user)

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    await user.click(screen.getByRole('button', { name: 'Save decision' }))

    expect(screen.getByText('Enter a rejection reason.')).toBeInTheDocument()
    expect(to('PATCH', '/reports/report-1/status')).toHaveLength(0)
  })

  it('rejects a report with a trimmed reason', async () => {
    const { user, to } = setup({
      routes: { 'PATCH /reports/report-1/status': { body: { success: true } } },
    })
    await openReview(user)

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    await user.type(screen.getByLabelText('Rejection reason'), '  False alarm  ')
    await user.click(screen.getByRole('button', { name: 'Save decision' }))

    expect(await screen.findByText('Decision saved.')).toBeInTheDocument()
    expect(to('PATCH', '/reports/report-1/status')[0].body).toEqual({
      status: 'REJECTED',
      rejectionReason: 'False alarm',
    })
  })

  it('shows the server message when the decision cannot be saved', async () => {
    const { user } = setup({
      routes: { 'PATCH /reports/report-1/status': { status: 409, body: { message: 'Report already reviewed' } } },
    })
    await openReview(user)

    await user.click(screen.getByRole('button', { name: 'Save decision' }))

    expect(await screen.findByText('Report already reviewed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save decision' })).toBeEnabled()
  })

  it('shows a reviewed report read-only, with the officer notes and an Issue Alert button when verified', async () => {
    const { user, onIssueAlertFromReport } = setup()
    await openReview(user, 'RPT-2026-002')

    expect(screen.getByLabelText('Officer notes')).toBeDisabled()
    expect(screen.getByLabelText('Officer notes')).toHaveValue('Confirmed by field team')
    expect(screen.queryByRole('button', { name: 'Save decision' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument()

    await user.click(reviewDialog('RPT-2026-002').getByRole('button', { name: 'Issue Alert' }))

    expect(onIssueAlertFromReport).toHaveBeenCalledWith(expect.objectContaining({ _id: 'report-2' }))
  })

  it('shows why a report was rejected and offers no alert', async () => {
    const { user } = setup()
    await openReview(user, 'RPT-2026-003')

    expect(screen.getByText('Rejected: Duplicate of RPT-2026-001')).toBeInTheDocument()
    expect(reviewDialog('RPT-2026-003').queryByRole('button', { name: 'Issue Alert' })).not.toBeInTheDocument()
  })

  it('closes the review dialog', async () => {
    const { user } = setup()
    await openReview(user)

    await user.click(screen.getAllByRole('button', { name: 'Close' })[0])

    expect(screen.queryByRole('heading', { name: 'Report RPT-2026-001' })).not.toBeInTheDocument()
  })
})

describe('DisasterReportsSection - issuing an alert from a verified report', () => {
  it('hands the verified report to the alert form from the list', async () => {
    const { user, onIssueAlertFromReport } = setup()
    await screen.findByText('RPT-2026-002')

    await user.click(within(rowOf('RPT-2026-002')).getByRole('button', { name: 'Issue Alert' }))

    expect(onIssueAlertFromReport).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ _id: 'report-2', reportNumber: 'RPT-2026-002' }),
    )
  })

  it('only offers Issue Alert on verified reports', async () => {
    setup()
    await screen.findByText('RPT-2026-001')

    expect(within(rowOf('RPT-2026-001')).queryByRole('button', { name: 'Issue Alert' })).not.toBeInTheDocument()
    expect(within(rowOf('RPT-2026-003')).queryByRole('button', { name: 'Issue Alert' })).not.toBeInTheDocument()
  })

  it('hides Issue Alert when the page has nowhere to send the report', async () => {
    setup({ props: { onIssueAlertFromReport: undefined } })
    await screen.findByText('RPT-2026-002')

    expect(screen.queryByRole('button', { name: 'Issue Alert' })).not.toBeInTheDocument()
  })
})

describe('DisasterReportsSection - photos', () => {
  const withPhoto = buildReport({ photoUrl: '/uploads/flood.jpg' })

  it('resolves a relative photo path against the API host and enlarges it on click', async () => {
    const { user } = setup({ reports: [withPhoto] })
    await openReview(user)

    const thumbnail = screen.getByAltText('Report RPT-2026-001')
    expect(thumbnail).toHaveAttribute('src', 'http://localhost:3000/uploads/flood.jpg')

    await user.click(thumbnail)
    const preview = screen.getByAltText('Report preview')
    expect(preview).toHaveAttribute('src', 'http://localhost:3000/uploads/flood.jpg')

    await user.click(preview.parentElement!)
    expect(screen.queryByAltText('Report preview')).not.toBeInTheDocument()
  })

  it('keeps absolute photo URLs unchanged', async () => {
    const { user } = setup({ reports: [buildReport({ photoUrl: 'https://cdn.example.com/a.jpg' })] })
    await openReview(user)

    expect(screen.getByAltText('Report RPT-2026-001')).toHaveAttribute('src', 'https://cdn.example.com/a.jpg')
  })
})

describe('DisasterReportsSection - logging an incident', () => {
  it('opens the incident form and closes it again', async () => {
    const { user } = setup()
    await screen.findByText('RPT-2026-001')

    await user.click(screen.getByRole('button', { name: 'Log Incident' }))
    expect(screen.getByRole('heading', { name: 'Log Disaster Incident Report' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('heading', { name: 'Log Disaster Incident Report' })).not.toBeInTheDocument()
  })

  it('reloads the list after an incident is logged', async () => {
    const { user, to } = setup({ routes: { 'POST /reports': { body: { success: true } } } })
    await screen.findByText('RPT-2026-001')

    await user.click(screen.getByRole('button', { name: 'Log Incident' }))
    await user.type(screen.getByLabelText('Incident Description *'), 'Road blocked by a fallen tree')
    await user.click(screen.getByRole('button', { name: 'Submit Incident Report' }))

    await waitFor(() => expect(to('POST', '/reports')).toHaveLength(1))
    await waitFor(() => expect(to('GET', '/reports')).toHaveLength(2))
    expect(screen.queryByRole('heading', { name: 'Log Disaster Incident Report' })).not.toBeInTheDocument()
  })
})
