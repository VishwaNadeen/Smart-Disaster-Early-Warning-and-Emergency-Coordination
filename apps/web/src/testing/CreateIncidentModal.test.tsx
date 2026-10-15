import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateIncidentModal from '../pages/dmc/CreateIncidentModal'
import { installFetch, type RouteHandler } from './helpers'

function setup(routes: Record<string, RouteHandler> = { 'POST /reports': { body: { success: true } } }) {
  const api = installFetch(routes)
  const onCreated = vi.fn()
  const onCancel = vi.fn()
  render(
    <CreateIncidentModal
      token="test-token"
      districts={['Galle', 'Kandy']}
      defaultDistrict="Kandy"
      onCreated={onCreated}
      onCancel={onCancel}
    />,
  )
  return { ...api, onCreated, onCancel, user: userEvent.setup({ delay: null }) }
}

const submittedForm = (api: ReturnType<typeof setup>) => api.to('POST', '/reports')[0].body as FormData

describe('CreateIncidentModal', () => {
  it('starts with the default district and a flood report', () => {
    setup()

    expect(screen.getByLabelText('District *')).toHaveValue('Kandy')
    expect(screen.getByLabelText('Hazard Type *')).toHaveValue('FLOOD')
    expect(screen.queryByLabelText('Specify Hazard Type *')).not.toBeInTheDocument()
  })

  it('submits the incident with the officer token and form data', async () => {
    const api = setup()
    const { user } = api

    await user.selectOptions(screen.getByLabelText('Hazard Type *'), 'LANDSLIDE')
    await user.selectOptions(screen.getByLabelText('District *'), 'Galle')
    await user.type(screen.getByLabelText('City / Town'), 'Hikkaduwa')
    await user.type(screen.getByLabelText('Specific Location / Landmark'), 'Near the bridge')
    await user.type(screen.getByLabelText('Incident Description *'), 'Soil is sliding onto the road')
    await user.click(screen.getByRole('button', { name: 'Submit Incident Report' }))

    await waitFor(() => expect(api.onCreated).toHaveBeenCalledOnce())
    const form = submittedForm(api)
    expect(api.to('POST', '/reports')[0].headers.Authorization).toBe('Bearer test-token')
    expect(form.get('hazardType')).toBe('LANDSLIDE')
    expect(form.get('district')).toBe('Galle')
    expect(form.get('city')).toBe('Hikkaduwa')
    expect(form.get('manualLocation')).toBe('Near the bridge')
    expect(form.get('description')).toBe('Soil is sliding onto the road')
    expect(form.has('photo')).toBe(false)
  })

  it('omits optional fields that were left empty', async () => {
    const api = setup()

    await api.user.type(screen.getByLabelText('Incident Description *'), 'Heavy flooding')
    await api.user.click(screen.getByRole('button', { name: 'Submit Incident Report' }))

    await waitFor(() => expect(api.onCreated).toHaveBeenCalled())
    const form = submittedForm(api)
    expect(form.has('city')).toBe(false)
    expect(form.has('manualLocation')).toBe(false)
    expect(form.has('customHazardType')).toBe(false)
  })

  it('asks for the hazard name when "Other" is chosen and sends it', async () => {
    const api = setup()

    await api.user.selectOptions(screen.getByLabelText('Hazard Type *'), 'OTHER')
    await api.user.type(screen.getByLabelText('Specify Hazard Type *'), 'Chemical spill')
    await api.user.type(screen.getByLabelText('Incident Description *'), 'Tanker overturned')
    await api.user.click(screen.getByRole('button', { name: 'Submit Incident Report' }))

    await waitFor(() => expect(api.onCreated).toHaveBeenCalled())
    expect(submittedForm(api).get('customHazardType')).toBe('Chemical spill')
  })

  it('attaches a photo when one is chosen', async () => {
    const api = setup()
    const photo = new File(['x'], 'flood.png', { type: 'image/png' })

    await api.user.upload(screen.getByLabelText(/Upload Verification Photo/), photo)
    await api.user.type(screen.getByLabelText('Incident Description *'), 'See photo')
    await api.user.click(screen.getByRole('button', { name: 'Submit Incident Report' }))

    await waitFor(() => expect(api.onCreated).toHaveBeenCalled())
    expect((submittedForm(api).get('photo') as File).name).toBe('flood.png')
  })

  it('rejects a description made only of spaces', async () => {
    const api = setup()

    await api.user.type(screen.getByLabelText('Incident Description *'), '   ')
    await api.user.click(screen.getByRole('button', { name: 'Submit Incident Report' }))

    expect(screen.getByText('Please provide a description or attach a photo.')).toBeInTheDocument()
    expect(api.to('POST', '/reports')).toHaveLength(0)
    expect(api.onCreated).not.toHaveBeenCalled()
  })

  it('shows the server message and stays open when submission fails', async () => {
    const api = setup({ 'POST /reports': { status: 422, body: { message: 'District is not supported' } } })

    await api.user.type(screen.getByLabelText('Incident Description *'), 'Flooding')
    await api.user.click(screen.getByRole('button', { name: 'Submit Incident Report' }))

    expect(await screen.findByText('District is not supported')).toBeInTheDocument()
    expect(api.onCreated).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Submit Incident Report' })).toBeEnabled()
  })

  it('falls back to a generic message when the server gives none', async () => {
    const api = setup({ 'POST /reports': { status: 500, body: {} } })

    await api.user.type(screen.getByLabelText('Incident Description *'), 'Flooding')
    await api.user.click(screen.getByRole('button', { name: 'Submit Incident Report' }))

    expect(await screen.findByText('Failed to submit report')).toBeInTheDocument()
  })

  it('shows a network error message', async () => {
    const api = setup()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))

    await api.user.type(screen.getByLabelText('Incident Description *'), 'Flooding')
    await api.user.click(screen.getByRole('button', { name: 'Submit Incident Report' }))

    expect(await screen.findByText('Network down')).toBeInTheDocument()
  })

  it('cancels without sending anything', async () => {
    const api = setup()

    await api.user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(api.onCancel).toHaveBeenCalledOnce()
    expect(api.to('POST', '/reports')).toHaveLength(0)
  })
})
