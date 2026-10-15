import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AffectedAreaMap from '../pages/dmc/AffectedAreaMap'
import type { MapShelter } from '../pages/dmc/ShelterMap'
import { SRI_LANKA_CENTER, SRI_LANKA_DISTRICTS } from '../pages/dmc/sriLankaDistricts'
import { mapActions } from './reactLeafletMock'

vi.mock('react-leaflet', async () => (await import('./reactLeafletMock')).reactLeafletMock)

function buildShelter(overrides: Partial<MapShelter> = {}): MapShelter {
  return {
    _id: 'shelter-1',
    name: 'Peradeniya Community Hall',
    shelterCode: 'SHL-001',
    address: 'Main Street',
    city: 'Peradeniya',
    district: 'Kandy',
    province: 'Central',
    latitude: 7.26,
    longitude: 80.59,
    maximumCapacity: 200,
    operationalStatus: 'OPEN',
    ...overrides,
  }
}

function renderMap(props: Partial<Parameters<typeof AffectedAreaMap>[0]> = {}) {
  const onToggleDistrict = vi.fn()
  const onAddCity = vi.fn()
  render(
    <AffectedAreaMap
      selectedDistricts={[]}
      onToggleDistrict={onToggleDistrict}
      onAddCity={onAddCity}
      {...props}
    />,
  )
  return { onToggleDistrict, onAddCity, user: userEvent.setup() }
}

const districtMarkers = () =>
  screen
    .getAllByTestId('marker')
    .filter((marker) => within(marker).queryByText(/Add district|Remove district/))

describe('AffectedAreaMap', () => {
  beforeEach(() => {
    mapActions.setView.mockClear()
    mapActions.flyTo.mockClear()
    mapActions.fitBounds.mockClear()
  })

  it('draws a marker for each of the 25 districts and no zones when nothing is selected', () => {
    renderMap()

    expect(districtMarkers()).toHaveLength(25)
    expect(screen.queryAllByTestId('zone')).toHaveLength(0)
  })

  it('highlights every selected district with a red zone at its coordinates', () => {
    renderMap({ selectedDistricts: ['Kandy', 'Galle'] })

    const zones = screen.getAllByTestId('zone')
    const centres = zones.map((zone) => zone.getAttribute('data-center'))
    expect(zones).toHaveLength(2)
    expect(centres).toContain(`${SRI_LANKA_DISTRICTS.Kandy.lat},${SRI_LANKA_DISTRICTS.Kandy.lng}`)
    expect(centres).toContain(`${SRI_LANKA_DISTRICTS.Galle.lat},${SRI_LANKA_DISTRICTS.Galle.lng}`)
  })

  it('toggles a district when its marker is clicked', async () => {
    const { user, onToggleDistrict } = renderMap()
    const kandy = screen
      .getAllByTestId('marker')
      .find((marker) => marker.getAttribute('data-position') === `${SRI_LANKA_DISTRICTS.Kandy.lat},${SRI_LANKA_DISTRICTS.Kandy.lng}`)!

    await user.click(kandy)

    expect(onToggleDistrict).toHaveBeenCalledExactlyOnceWith('Kandy')
  })

  it('offers "Add district" for unselected and "Remove district" for selected districts', () => {
    renderMap({ selectedDistricts: ['Kandy'] })

    expect(screen.getAllByRole('button', { name: 'Remove district' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Add district' })).toHaveLength(24)
  })

  it('adds a city from the district popup without toggling the district', async () => {
    const { user, onAddCity, onToggleDistrict } = renderMap()

    await user.click(screen.getAllByRole('button', { name: '+ Peradeniya' })[0])

    expect(onAddCity).toHaveBeenCalledExactlyOnceWith('Peradeniya')
    expect(onToggleDistrict).not.toHaveBeenCalled()
  })

  it('lists the province and key cities of each district in its popup', () => {
    renderMap()

    const popups = screen.getAllByTestId('popup')
    const kandyPopup = popups.find((popup) => within(popup).queryByText('Kandy'))!
    expect(within(kandyPopup).getByText('Central Province')).toBeInTheDocument()
    expect(within(kandyPopup).getByRole('button', { name: '+ Gampola' })).toBeInTheDocument()
  })

  it('shows shelters with valid coordinates only', () => {
    renderMap({
      shelters: [
        buildShelter(),
        buildShelter({ _id: 'no-coords', name: 'Unmapped shelter', latitude: undefined, longitude: undefined }),
        buildShelter({ _id: 'bad-coords', name: 'Broken shelter', latitude: Number.NaN }),
      ],
    })

    expect(screen.getByText('Peradeniya Community Hall')).toBeInTheDocument()
    expect(screen.getByText(/OPEN · Capacity 200/)).toBeInTheDocument()
    expect(screen.queryByText('Unmapped shelter')).not.toBeInTheDocument()
    expect(screen.queryByText('Broken shelter')).not.toBeInTheDocument()
  })

  it('renders the reported incident marker and legend entry when provided', () => {
    renderMap({ incident: { latitude: 7.3, longitude: 80.6, label: 'Report RPT-1' } })

    expect(screen.getByText('Report RPT-1')).toBeInTheDocument()
    expect(screen.getByText('Reported incident')).toBeInTheDocument()
  })

  it('omits the incident legend entry when there is no incident', () => {
    renderMap()

    expect(screen.queryByText('Reported incident')).not.toBeInTheDocument()
    expect(screen.getByText('Affected district')).toBeInTheDocument()
  })

  it('resets the camera to the island when nothing is selected', () => {
    renderMap()

    expect(mapActions.setView).toHaveBeenCalledWith(SRI_LANKA_CENTER, 7)
  })

  it('flies to a single selected district', () => {
    renderMap({ selectedDistricts: ['Kandy'] })

    expect(mapActions.flyTo).toHaveBeenCalledWith(
      [SRI_LANKA_DISTRICTS.Kandy.lat, SRI_LANKA_DISTRICTS.Kandy.lng],
      9,
      { duration: 0.5 },
    )
  })

  it('fits the camera around several selected districts', () => {
    renderMap({ selectedDistricts: ['Kandy', 'Galle', 'Jaffna'] })

    expect(mapActions.fitBounds).toHaveBeenCalledTimes(1)
    expect(mapActions.fitBounds.mock.calls[0][0]).toHaveLength(3)
  })

  it('includes the incident location when fitting the camera', () => {
    renderMap({
      selectedDistricts: ['Kandy'],
      incident: { latitude: 7.3, longitude: 80.6, label: 'Report RPT-1' },
    })

    expect(mapActions.fitBounds.mock.calls[0][0]).toContainEqual([7.3, 80.6])
  })

  it('ignores unknown district names instead of crashing', () => {
    renderMap({ selectedDistricts: ['Atlantis'] })

    expect(screen.queryAllByTestId('zone')).toHaveLength(0)
    expect(mapActions.setView).toHaveBeenCalledWith(SRI_LANKA_CENTER, 7)
  })
})
