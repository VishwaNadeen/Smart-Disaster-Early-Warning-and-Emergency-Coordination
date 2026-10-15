import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DisasterWarningsSection from '../pages/dmc/DisasterWarningsSection'
import {
  buildAlert,
  buildDelivery,
  buildReport,
  installFetch,
  type RouteHandler,
} from './helpers'

// The real map is covered by AffectedAreaMap.test.tsx; here it is a small stand-in
// that lets the form tests choose districts and cities.
vi.mock('../pages/dmc/AffectedAreaMap', () => ({
  default: (props: {
    selectedDistricts: string[]
    onToggleDistrict: (name: string) => void
    onAddCity: (name: string) => void
    incident?: { label: string } | null
  }) => (
    <div data-testid="affected-area-map">
      <span data-testid="map-selection">{props.selectedDistricts.join('|')}</span>
      {props.incident && <span data-testid="map-incident">{props.incident.label}</span>}
      <button type="button" onClick={() => props.onToggleDistrict('Kandy')}>
        map: toggle Kandy
      </button>
      <button type="button" onClick={() => props.onAddCity('Peradeniya')}>
        map: add Peradeniya
      </button>
    </div>
  ),
}))

const PUBLISHED = buildAlert()
const CANCELLED = buildAlert({
  _id: 'alert-2',
  title: 'Old landslide alert',
  severity: 'EMERGENCY',
  hazardType: 'LANDSLIDE',
  status: 'CANCELLED',
  cancellationReason: 'Threat has passed',
})

function setup(
  options: {
    alerts?: ReturnType<typeof buildAlert>[]
    routes?: Record<string, RouteHandler>
    props?: Partial<Parameters<typeof DisasterWarningsSection>[0]>
  } = {},
) {
  const api = installFetch({
    'GET /reports/districts': { body: { data: ['Kandy', 'Galle'] } },
    'GET /hazard-alerts/history': { body: { data: options.alerts ?? [PUBLISHED, CANCELLED] } },
    ...options.routes,
  })
  const onActiveCountChange = vi.fn()
  const onReportDraftConsumed = vi.fn()
  render(
    <DisasterWarningsSection
      token="test-token"
      onActiveCountChange={onActiveCountChange}
      onReportDraftConsumed={onReportDraftConsumed}
      {...options.props}
    />,
  )
  return { ...api, onActiveCountChange, onReportDraftConsumed, user: userEvent.setup({ delay: null }) }
}

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Issue Alert' }))
  await screen.findByRole('heading', { name: 'Issue Location-Specific Alert' })
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Title'), 'Flood warning')
  await user.click(screen.getByRole('radio', { name: /Warning/ }))
  await user.type(screen.getByLabelText('Alert message'), 'River is rising fast')
  await user.type(screen.getByLabelText('Safety instructions'), 'Go to the shelter')
  await user.click(screen.getByRole('button', { name: 'map: toggle Kandy' }))
}

const formAlert = () => screen.getAllByRole('alert')[0]

describe('DisasterWarningsSection - alert list', () => {
  it('loads every alert from the officer history endpoint with the auth token', async () => {
    const { requests } = setup()

    expect(await screen.findByText('Flood warning - Kandy')).toBeInTheDocument()
    expect(screen.getByText('Old landslide alert')).toBeInTheDocument()
    const historyCall = requests.find((r) => r.path === '/hazard-alerts/history')!
    expect(historyCall.headers.Authorization).toBe('Bearer test-token')
  })

  it('reports the number of active alerts, excluding cancelled ones', async () => {
    const { onActiveCountChange } = setup()

    expect(await screen.findByText('1 active alert')).toBeInTheDocument()
    expect(onActiveCountChange).toHaveBeenCalledWith(1)
  })

  it('pluralises the active alert count', async () => {
    setup({ alerts: [PUBLISHED, buildAlert({ _id: 'alert-3', title: 'Second' })] })

    expect(await screen.findByText('2 active alerts')).toBeInTheDocument()
  })

  it('shows cancelled alerts greyed out with their reason and without a cancel button', async () => {
    setup()

    const card = (await screen.findByText('Old landslide alert')).closest('article')!
    expect(within(card).getByText('Cancelled')).toBeInTheDocument()
    expect(within(card).getByText('Cancelled: Threat has passed')).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Deliveries' })).toBeInTheDocument()
  })

  it('shows severity, hazard, safety instructions and affected areas on a card', async () => {
    setup({ alerts: [buildAlert({ affectedCities: ['Peradeniya'], sourceReportNumber: 'RPT-9' })] })

    const card = (await screen.findByText('Flood warning - Kandy')).closest('article')!
    expect(within(card).getByText('Warning')).toBeInTheDocument()
    expect(within(card).getByText('Flood')).toBeInTheDocument()
    expect(within(card).getByText('Move to the nearest shelter.')).toBeInTheDocument()
    expect(within(card).getByText('Kandy')).toBeInTheDocument()
    expect(within(card).getByText('Peradeniya')).toBeInTheDocument()
    expect(within(card).getByText('RPT-9')).toBeInTheDocument()
  })

  it('shows an empty state when there are no alerts', async () => {
    setup({ alerts: [] })

    expect(await screen.findByText('No alerts found')).toBeInTheDocument()
  })

  it('shows the server message when the list cannot be loaded', async () => {
    setup({
      routes: { 'GET /hazard-alerts/history': { status: 403, body: { message: 'Forbidden resource' } } },
    })

    expect(await screen.findByText('Forbidden resource')).toBeInTheDocument()
  })

  it('shows a generic message when the network fails', async () => {
    installFetch({})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))
    render(<DisasterWarningsSection token="t" />)

    expect(await screen.findByText('Network down')).toBeInTheDocument()
  })

  it('filters by search text', async () => {
    const { user } = setup()
    await screen.findByText('Flood warning - Kandy')

    await user.type(screen.getByPlaceholderText('Search alerts'), 'landslide')

    expect(screen.queryByText('Flood warning - Kandy')).not.toBeInTheDocument()
    expect(screen.getByText('Old landslide alert')).toBeInTheDocument()
  })

  it('filters by status so cancelled alerts can be shown on their own', async () => {
    const { user } = setup()
    await screen.findByText('Flood warning - Kandy')

    await user.click(screen.getByRole('button', { name: 'Filter by status' }))
    await user.click(screen.getByRole('button', { name: 'Cancelled' }))

    expect(screen.queryByText('Flood warning - Kandy')).not.toBeInTheDocument()
    expect(screen.getByText('Old landslide alert')).toBeInTheDocument()
  })

  it('filters by severity', async () => {
    const { user } = setup()
    await screen.findByText('Flood warning - Kandy')

    await user.click(screen.getByRole('button', { name: 'Filter by severity' }))
    await user.click(screen.getByRole('button', { name: 'Warning' }))

    expect(screen.getByText('Flood warning - Kandy')).toBeInTheDocument()
    expect(screen.queryByText('Old landslide alert')).not.toBeInTheDocument()
  })

  it('filters by district', async () => {
    const { user } = setup({
      alerts: [PUBLISHED, buildAlert({ _id: 'g', title: 'Galle swell', affectedDistricts: ['Galle'] })],
    })
    await screen.findByText('Galle swell')

    await user.click(screen.getByRole('button', { name: 'Filter by district' }))
    await user.click(screen.getByRole('button', { name: 'Galle' }))

    expect(screen.getByText('Galle swell')).toBeInTheDocument()
    expect(screen.queryByText('Flood warning - Kandy')).not.toBeInTheDocument()
  })

  it('refreshes the list from the refresh button', async () => {
    const { user, to } = setup()
    await screen.findByText('Flood warning - Kandy')

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    await waitFor(() => expect(to('GET', '/hazard-alerts/history')).toHaveLength(2))
  })
})

describe('DisasterWarningsSection - create form validation (alternate flow: invalid data)', () => {
  it('requires a title first', async () => {
    const { user } = setup()
    await openForm(user)

    await user.click(screen.getByRole('button', { name: 'Review alert' }))

    expect(formAlert()).toHaveTextContent('Alert title is required.')
  })

  it('requires a severity level', async () => {
    const { user } = setup()
    await openForm(user)
    await user.type(screen.getByLabelText('Title'), 'Flood')

    await user.click(screen.getByRole('button', { name: 'Review alert' }))

    expect(formAlert()).toHaveTextContent('Select a severity level.')
  })

  it('requires at least one affected district', async () => {
    const { user } = setup()
    await openForm(user)
    await user.type(screen.getByLabelText('Title'), 'Flood')
    await user.click(screen.getByRole('radio', { name: /Watch/ }))

    await user.click(screen.getByRole('button', { name: 'Review alert' }))

    expect(formAlert()).toHaveTextContent('Select at least one affected district.')
  })

  it('requires a message', async () => {
    const { user } = setup()
    await openForm(user)
    await user.type(screen.getByLabelText('Title'), 'Flood')
    await user.click(screen.getByRole('radio', { name: /Watch/ }))
    await user.click(screen.getByRole('button', { name: 'map: toggle Kandy' }))

    await user.click(screen.getByRole('button', { name: 'Review alert' }))

    expect(formAlert()).toHaveTextContent('Alert message is required.')
  })

  it('requires safety instructions', async () => {
    const { user } = setup()
    await openForm(user)
    await user.type(screen.getByLabelText('Title'), 'Flood')
    await user.click(screen.getByRole('radio', { name: /Watch/ }))
    await user.click(screen.getByRole('button', { name: 'map: toggle Kandy' }))
    await user.type(screen.getByLabelText('Alert message'), 'Rising water')

    await user.click(screen.getByRole('button', { name: 'Review alert' }))

    expect(formAlert()).toHaveTextContent('Safety instructions are required.')
  })

  it('requires at least one notification method', async () => {
    const { user } = setup()
    await openForm(user)
    await fillValidForm(user)
    await user.click(screen.getByRole('checkbox', { name: 'SMS text message' }))

    await user.click(screen.getByRole('button', { name: 'Review alert' }))

    expect(formAlert()).toHaveTextContent('Select at least one notification method.')
  })

  it('never calls the API while the form is invalid', async () => {
    const { user, to } = setup()
    await openForm(user)

    await user.click(screen.getByRole('button', { name: 'Review alert' }))

    expect(to('POST', '/hazard-alerts')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Confirm & Publish' })).not.toBeInTheDocument()
  })
})

describe('DisasterWarningsSection - area, city and channel selection', () => {
  it('defaults to SMS notification', async () => {
    const { user } = setup()
    await openForm(user)

    expect(screen.getByRole('checkbox', { name: 'SMS text message' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Mobile push' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'WhatsApp' })).not.toBeChecked()
  })

  it('adds and removes districts picked on the map', async () => {
    const { user } = setup()
    await openForm(user)

    await user.click(screen.getByRole('button', { name: 'map: toggle Kandy' }))
    expect(screen.getByTestId('map-selection')).toHaveTextContent('Kandy')
    expect(screen.getByText('Districts (1)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'map: toggle Kandy' }))
    expect(screen.getByTestId('map-selection')).toHaveTextContent('')
    expect(screen.getByText('Districts (0)')).toBeInTheDocument()
  })

  it('adds a district from the dropdown and removes it by clicking its chip', async () => {
    const { user } = setup()
    await openForm(user)

    await user.click(screen.getByRole('button', { name: 'Add a district' }))
    await user.click(screen.getByRole('button', { name: 'Galle' }))
    const chip = screen.getByRole('button', { name: 'Galle' })
    expect(screen.getByTestId('map-selection')).toHaveTextContent('Galle')

    await user.click(chip)

    expect(screen.getByTestId('map-selection')).toHaveTextContent('')
  })

  it('adds a city chosen on the map once and ignores duplicates', async () => {
    const { user } = setup()
    await openForm(user)

    await user.click(screen.getByRole('button', { name: 'map: add Peradeniya' }))
    await user.click(screen.getByRole('button', { name: 'map: add Peradeniya' }))

    expect(screen.getAllByRole('button', { name: 'Peradeniya' })).toHaveLength(1)
  })

  it('adds a typed city on Enter, ignores blank input and removes a city chip', async () => {
    const { user } = setup()
    await openForm(user)
    const input = screen.getByPlaceholderText('Type a city and press Enter')

    await user.type(input, '   {Enter}')
    expect(screen.queryByRole('button', { name: 'Gampola' })).not.toBeInTheDocument()

    await user.type(input, 'Gampola{Enter}')
    expect(input).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Gampola' }))

    expect(screen.queryByRole('button', { name: 'Gampola' })).not.toBeInTheDocument()
  })

  it('suggests cities of the selected districts and adds one on click', async () => {
    const { user } = setup()
    await openForm(user)
    await user.click(screen.getByRole('button', { name: 'map: toggle Kandy' }))

    await user.click(screen.getByRole('button', { name: '+ Katugastota' }))

    expect(screen.getByRole('button', { name: 'Katugastota' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Katugastota' })).not.toBeInTheDocument()
  })

  it('toggles notification channels independently', async () => {
    const { user } = setup()
    await openForm(user)

    await user.click(screen.getByRole('checkbox', { name: 'Mobile push' }))
    await user.click(screen.getByRole('checkbox', { name: 'SMS text message' }))

    expect(screen.getByRole('checkbox', { name: 'Mobile push' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'SMS text message' })).not.toBeChecked()
  })

  it('lets the officer pick the hazard type', async () => {
    const { user } = setup()
    await openForm(user)

    await user.click(screen.getByRole('button', { name: 'Hazard type' }))
    await user.click(screen.getByRole('button', { name: 'Landslide' }))

    expect(screen.getByRole('button', { name: 'Hazard type' })).toHaveTextContent('Landslide')
  })
})

describe('DisasterWarningsSection - preview before publishing', () => {
  it('shows a preview of the alert, areas and channels without sending anything', async () => {
    const { user, to } = setup()
    await openForm(user)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'map: add Peradeniya' }))

    await user.click(screen.getByRole('button', { name: 'Review alert' }))

    expect(await screen.findByRole('button', { name: 'Confirm & Publish' })).toBeInTheDocument()
    const preview = screen.getByRole('heading', { name: 'Flood warning' }).closest('article')!
    expect(within(preview).getByText('River is rising fast')).toBeInTheDocument()
    expect(within(preview).getByText(/Go to the shelter/)).toBeInTheDocument()
    expect(within(preview).getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('Peradeniya', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('SMS text message', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText(/sent\s+immediately/)).toBeInTheDocument()
    expect(to('POST', '/hazard-alerts')).toHaveLength(0)
  })

  it('describes an empty city list as the whole district', async () => {
    const { user } = setup()
    await openForm(user)
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: 'Review alert' }))

    expect(await screen.findByText('Whole district (all cities)')).toBeInTheDocument()
  })

  it('returns to the form with everything still filled in', async () => {
    const { user } = setup()
    await openForm(user)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Review alert' }))

    await user.click(await screen.findByRole('button', { name: 'Back to edit' }))

    expect(screen.queryByRole('button', { name: 'Confirm & Publish' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Flood warning')
    expect(screen.getByTestId('map-selection')).toHaveTextContent('Kandy')
  })
})

describe('DisasterWarningsSection - publishing (main flow)', () => {
  async function publish(user: ReturnType<typeof userEvent.setup>) {
    await openForm(user)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Review alert' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm & Publish' }))
  }

  const postReply = (dispatch: object): RouteHandler => ({
    body: { data: { alert: PUBLISHED, dispatch } },
  })

  it('sends the alert with the chosen areas and channels and refreshes the list', async () => {
    const { user, to } = setup({
      routes: {
        'POST /hazard-alerts': postReply({ matchedCitizens: 1, smsAttempts: 1, skippedWithoutEnabledChannel: 0 }),
      },
    })

    await publish(user)

    await waitFor(() => expect(to('POST', '/hazard-alerts')).toHaveLength(1))
    expect(to('POST', '/hazard-alerts')[0].body).toEqual({
      title: 'Flood warning',
      message: 'River is rising fast',
      safetyInstructions: 'Go to the shelter',
      hazardType: 'FLOOD',
      severity: 'WARNING',
      affectedDistricts: ['Kandy'],
      affectedCities: ['All Cities'],
      notificationChannels: ['SMS'],
    })
    await waitFor(() => expect(to('GET', '/hazard-alerts/history')).toHaveLength(2))
    expect(screen.queryByRole('heading', { name: 'Issue Location-Specific Alert' })).not.toBeInTheDocument()
  })

  it('sends the selected cities instead of "All Cities"', async () => {
    const { user, to } = setup({
      routes: { 'POST /hazard-alerts': postReply({ matchedCitizens: 1, smsAttempts: 1 }) },
    })
    await openForm(user)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'map: add Peradeniya' }))
    await user.click(screen.getByRole('button', { name: 'Review alert' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm & Publish' }))

    await waitFor(() => expect(to('POST', '/hazard-alerts')).toHaveLength(1))
    expect(to('POST', '/hazard-alerts')[0].body).toMatchObject({ affectedCities: ['Peradeniya'] })
  })

  it('confirms how many citizens were notified', async () => {
    const { user } = setup({
      routes: {
        'POST /hazard-alerts': postReply({
          matchedCitizens: 5,
          smsAttempts: 3,
          pushAttempts: 0,
          whatsappAttempts: 0,
          skippedWithoutEnabledChannel: 2,
          failedAttempts: 0,
        }),
      },
    })

    await publish(user)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Alert published. 3 notification(s) sent to 3 citizen(s).',
    )
  })

  it('warns when no registered citizen lives in the selected area', async () => {
    const { user } = setup({ routes: { 'POST /hazard-alerts': postReply({ matchedCitizens: 0 }) } })

    await publish(user)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'no registered citizens were found in the selected area',
    )
  })

  it('warns when citizens exist but none can be reached through the selected channels', async () => {
    const { user } = setup({
      routes: { 'POST /hazard-alerts': postReply({ matchedCitizens: 4, skippedWithoutEnabledChannel: 4 }) },
    })

    await publish(user)

    expect(await screen.findByRole('status')).toHaveTextContent(
      '4 citizen(s) live in the area, but none could be reached',
    )
  })

  it('reports partial delivery failures (exception flow: notification service failure)', async () => {
    const { user } = setup({
      routes: {
        'POST /hazard-alerts': postReply({ matchedCitizens: 3, smsAttempts: 3, failedAttempts: 2 }),
      },
    })

    await publish(user)

    expect(await screen.findByRole('status')).toHaveTextContent(
      '2 of 3 notification(s) failed to deliver; see the delivery report.',
    )
  })

  it('tells the officer when delivery could not be started at all', async () => {
    const { user } = setup({
      routes: { 'POST /hazard-alerts': postReply({ dispatchError: true }) },
    })

    await publish(user)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Alert published, but notification delivery failed.',
    )
  })

  it('can dismiss the result notice', async () => {
    const { user } = setup({ routes: { 'POST /hazard-alerts': postReply({ matchedCitizens: 0 }) } })
    await publish(user)
    await screen.findByRole('status')

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the server message and keeps the form open when publishing fails (exception flow: system error)', async () => {
    const { user } = setup({
      routes: { 'POST /hazard-alerts': { status: 400, body: { message: 'Only a verified incident report can be used' } } },
    })

    await publish(user)

    expect(await screen.findAllByText('Only a verified incident report can be used')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Confirm & Publish' })).toBeEnabled()
  })

  it('joins validation messages returned as a list', async () => {
    const { user } = setup({
      routes: { 'POST /hazard-alerts': { status: 400, body: { message: ['title too short', 'severity invalid'] } } },
    })

    await publish(user)

    expect(await screen.findAllByText('title too short, severity invalid')).not.toHaveLength(0)
  })

  it('disables the confirm button while the alert is being published', async () => {
    const { user } = setup({
      routes: { 'POST /hazard-alerts': postReply({ matchedCitizens: 0 }) },
    })
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const routed = globalThis.fetch
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') await gate
      return routed(input, init)
    })

    await openForm(user)
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Review alert' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm & Publish' }))

    expect(await screen.findByRole('button', { name: 'Publishing…' })).toBeDisabled()
    release()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Publishing…' })).not.toBeInTheDocument())
  })
})

describe('DisasterWarningsSection - alert created from a verified citizen report', () => {
  const draft = buildReport({
    _id: 'report-77',
    reportNumber: 'RPT-77',
    status: 'VERIFIED',
    hazardType: 'LANDSLIDE',
    city: 'Peradeniya',
    district: 'Kandy',
    latitude: 7.26,
    longitude: 80.59,
  })

  it('opens the form pre-filled from the report and shows its location on the map', async () => {
    setup({ props: { reportDraft: draft } })

    expect(await screen.findByRole('heading', { name: 'Issue Location-Specific Alert' })).toBeInTheDocument()
    expect(screen.getByText('Based on verified report RPT-77')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Landslide alert - Peradeniya')
    expect(screen.getByLabelText('Alert message')).toHaveValue(
      'Verified citizen report RPT-77: Water is entering houses near the bridge.',
    )
    expect(screen.getByTestId('map-selection')).toHaveTextContent('Kandy')
    expect(screen.getByRole('button', { name: 'Peradeniya' })).toBeInTheDocument()
    expect(screen.getByTestId('map-incident')).toHaveTextContent('Report RPT-77')
  })

  it('links the published alert to the report', async () => {
    const { user, to } = setup({
      props: { reportDraft: draft },
      routes: {
        'POST /hazard-alerts': { body: { data: { alert: PUBLISHED, dispatch: { matchedCitizens: 0 } } } },
      },
    })
    await screen.findByRole('heading', { name: 'Issue Location-Specific Alert' })
    await user.click(screen.getByRole('radio', { name: /Emergency/ }))
    await user.type(screen.getByLabelText('Safety instructions'), 'Evacuate now')

    await user.click(screen.getByRole('button', { name: 'Review alert' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm & Publish' }))

    await waitFor(() => expect(to('POST', '/hazard-alerts')).toHaveLength(1))
    expect(to('POST', '/hazard-alerts')[0].body).toMatchObject({
      sourceReportId: 'report-77',
      hazardType: 'LANDSLIDE',
      severity: 'EMERGENCY',
      affectedDistricts: ['Kandy'],
      affectedCities: ['Peradeniya'],
    })
  })

  it('falls back to a generated message when the report has no description', async () => {
    setup({ props: { reportDraft: buildReport({ description: '  ', hazardType: 'FLOOD', city: undefined }) } })

    expect(await screen.findByLabelText('Alert message')).toHaveValue(
      'Verified citizen report RPT-2026-001 reports flood in Kandy.',
    )
  })

  it('omits the map incident when the report has no GPS position', async () => {
    setup({ props: { reportDraft: buildReport({ latitude: undefined, longitude: undefined }) } })

    await screen.findByRole('heading', { name: 'Issue Location-Specific Alert' })
    expect(screen.queryByTestId('map-incident')).not.toBeInTheDocument()
  })

  it('tells the parent the draft was used when the form is closed', async () => {
    const { user, onReportDraftConsumed } = setup({ props: { reportDraft: draft } })
    await screen.findByRole('heading', { name: 'Issue Location-Specific Alert' })

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onReportDraftConsumed).toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Issue Location-Specific Alert' })).not.toBeInTheDocument()
  })

  it('starts from an empty form when an alert is issued manually afterwards', async () => {
    const { user } = setup({ props: { reportDraft: draft } })
    await screen.findByRole('heading', { name: 'Issue Location-Specific Alert' })
    await user.click(screen.getByRole('button', { name: 'Close' }))

    await user.click(screen.getByRole('button', { name: 'Issue Alert' }))

    expect(await screen.findByLabelText('Title')).toHaveValue('')
    expect(screen.queryByText(/Based on verified report/)).not.toBeInTheDocument()
  })
})

describe('DisasterWarningsSection - cancelling an alert', () => {
  async function openCancelDialog(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByText('Flood warning - Kandy')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: 'Cancel alert' })
  }

  it('requires a reason before cancelling', async () => {
    const { user, to } = setup({ alerts: [PUBLISHED] })
    await openCancelDialog(user)

    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }))

    expect(screen.getByText('Enter a cancellation reason.')).toBeInTheDocument()
    expect(to('PATCH', '/hazard-alerts/alert-1/cancel')).toHaveLength(0)
  })

  it('cancels the alert with the reason and reloads the list', async () => {
    const { user, to } = setup({
      alerts: [PUBLISHED],
      routes: { 'PATCH /hazard-alerts/alert-1/cancel': { body: { success: true } } },
    })
    await openCancelDialog(user)

    await user.type(screen.getByLabelText('Reason'), '  Water level dropped  ')
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }))

    await waitFor(() => expect(to('PATCH', '/hazard-alerts/alert-1/cancel')).toHaveLength(1))
    expect(to('PATCH', '/hazard-alerts/alert-1/cancel')[0].body).toEqual({ reason: 'Water level dropped' })
    await waitFor(() => expect(to('GET', '/hazard-alerts/history')).toHaveLength(2))
    expect(screen.queryByRole('heading', { name: 'Cancel alert' })).not.toBeInTheDocument()
  })

  it('keeps the alert when the officer backs out', async () => {
    const { user, to } = setup({ alerts: [PUBLISHED] })
    await openCancelDialog(user)

    await user.click(screen.getByRole('button', { name: 'Keep alert' }))

    expect(screen.queryByRole('heading', { name: 'Cancel alert' })).not.toBeInTheDocument()
    expect(to('PATCH', '/hazard-alerts/alert-1/cancel')).toHaveLength(0)
  })

  it('shows the server error when cancelling fails', async () => {
    const { user } = setup({
      alerts: [PUBLISHED],
      routes: {
        'PATCH /hazard-alerts/alert-1/cancel': { status: 404, body: { message: 'Alert not found' } },
      },
    })
    await openCancelDialog(user)
    await user.type(screen.getByLabelText('Reason'), 'No longer needed')

    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }))

    expect(await screen.findByText('Alert not found')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cancel alert' })).toBeInTheDocument()
  })
})

describe('DisasterWarningsSection - delivery report', () => {
  const deliveries = [
    buildDelivery(),
    buildDelivery({
      _id: 'delivery-2',
      recipientId: 'citizen-2',
      channel: 'WHATSAPP',
      status: 'FAILED',
      failureReason: 'SMS gateway (Notify.lk) configuration is incomplete',
    }),
    buildDelivery({ _id: 'delivery-3', recipientId: 'citizen-3', channel: 'PUSH', status: 'DELIVERED' }),
  ]

  it('summarises totals and lists each recipient with its channel and failure reason', async () => {
    const { user } = setup({
      alerts: [PUBLISHED],
      routes: { 'GET /hazard-alerts/alert-1/deliveries': { body: { data: { records: deliveries } } } },
    })
    await screen.findByText('Flood warning - Kandy')

    await user.click(screen.getByRole('button', { name: 'Deliveries' }))

    const dialog = (await screen.findByRole('heading', { name: 'Delivery report' })).closest('div.flex-col')!
    expect(await within(dialog as HTMLElement).findByText('citizen-2')).toBeInTheDocument()
    const summary = within(dialog as HTMLElement)
    expect(summary.getByText('Total').previousSibling).toHaveTextContent('3')
    expect(summary.getByText('Sent').previousSibling).toHaveTextContent('2')
    expect(summary.getByText('Failed').previousSibling).toHaveTextContent('1')
    expect(summary.getByText('SMS')).toBeInTheDocument()
    expect(summary.getByText('WhatsApp')).toBeInTheDocument()
    expect(summary.getByText('Push')).toBeInTheDocument()
    expect(summary.getByText('SMS gateway (Notify.lk) configuration is incomplete')).toBeInTheDocument()
  })

  it('says so when nothing was delivered', async () => {
    const { user } = setup({
      alerts: [PUBLISHED],
      routes: { 'GET /hazard-alerts/alert-1/deliveries': { body: { data: { records: [] } } } },
    })
    await screen.findByText('Flood warning - Kandy')

    await user.click(screen.getByRole('button', { name: 'Deliveries' }))

    expect(await screen.findByText('No deliveries recorded.')).toBeInTheDocument()
  })

  it('closes the report', async () => {
    const { user } = setup({
      alerts: [PUBLISHED],
      routes: { 'GET /hazard-alerts/alert-1/deliveries': { body: { data: { records: [] } } } },
    })
    await screen.findByText('Flood warning - Kandy')
    await user.click(screen.getByRole('button', { name: 'Deliveries' }))
    await screen.findByRole('heading', { name: 'Delivery report' })

    await user.click(screen.getAllByRole('button', { name: 'Close' })[0])

    expect(screen.queryByRole('heading', { name: 'Delivery report' })).not.toBeInTheDocument()
  })
})
