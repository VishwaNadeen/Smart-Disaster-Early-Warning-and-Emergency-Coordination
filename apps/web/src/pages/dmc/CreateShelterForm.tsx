
import { useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  X,
} from 'lucide-react'

import LocationPicker from '../../components/LocationPicker'
import { SRI_LANKA_LOCATIONS } from '../../data/sriLankaLocations'

const API_URL = 'http://localhost:3000/api'

const OPERATIONAL_STATUSES = [
  'OPEN',
  'CLOSED',
  'MAINTENANCE',
] as const

type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number]

interface CreateShelterFormProps {
  token: string
  onCreated: () => void
  onCancel: () => void
}

interface CreateShelterPayload {
  name: string
  shelterCode: string
  address: string
  city: string
  district: string
  province: string
  maximumCapacity: number
  latitude?: number
  longitude?: number
  operationalStatus?: OperationalStatus
  facilities?: string[]
  notes?: string
}

// REVIEW [DRY]: ~80% of this file (fields, location cascade, validation, map) is duplicated in EditShelterForm - extract a shared ShelterFormFields + validateShelterForm().
export default function CreateShelterForm({
  token,
  onCreated,
  onCancel,
}: CreateShelterFormProps) {
  const [form, setForm] = useState({
    name: '',
    shelterCode: '',
    address: '',
    city: '',
    district: '',
    province: '',
    maximumCapacity: '100',
    latitude: '',
    longitude: '',
    // REVIEW [Bug]: 'OPERATIONAL' is not a valid status - the select shows OPEN but this value is sent and the backend rejects it with 400; use 'OPEN'.
    operationalStatus: 'OPERATIONAL' as OperationalStatus,
    facilities: '',
    notes: '',
  })

  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const provinceOption = SRI_LANKA_LOCATIONS.find(
    (province) => province.name === selectedProvince,
  )

  const districtOption = provinceOption?.districts.find(
    (district) => district.name === selectedDistrict,
  )

  const cityOption = districtOption?.cities.find(
    (city) => city.name === selectedCity,
  )

  const defaultMapCenter: [number, number] = [7.8731, 80.7718]

  const selectedMapCenter: [number, number] =
    cityOption?.center ??
    districtOption?.center ??
    provinceOption?.center ??
    defaultMapCenter

  const selectedMapZoom =
    cityOption?.zoom ??
    districtOption?.zoom ??
    provinceOption?.zoom ??
    7

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  function clearCoordinates() {
    setForm((previous) => ({
      ...previous,
      latitude: '',
      longitude: '',
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const latitude = form.latitude.trim()
    const longitude = form.longitude.trim()

    if (Boolean(latitude) !== Boolean(longitude)) {
      setError(
        'Enter both latitude and longitude, or leave both empty.',
      )
      return
    }

    if (latitude && longitude) {
      const lat = Number(latitude)
      const lng = Number(longitude)

      if (
        !Number.isFinite(lat) ||
        lat < -90 ||
        lat > 90 ||
        !Number.isFinite(lng) ||
        lng < -180 ||
        lng > 180
      ) {
        setError('Enter valid latitude and longitude values.')
        return
      }
    }

    const capacity = Number(form.maximumCapacity)

    if (!Number.isInteger(capacity) || capacity < 1) {
      setError(
        'Maximum capacity must be a whole number greater than zero.',
      )
      return
    }

    const payload: CreateShelterPayload = {
      name: form.name.trim(),
      shelterCode: form.shelterCode.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      province: form.province.trim(),
      maximumCapacity: capacity,
      operationalStatus: form.operationalStatus,
    }

    if (latitude && longitude) {
      payload.latitude = Number(latitude)
      payload.longitude = Number(longitude)
    }

    const facilities = form.facilities
      .split(',')
      .map((facility) => facility.trim())
      .filter(Boolean)

    if (facilities.length > 0) {
      payload.facilities = facilities
    }

    if (form.notes.trim()) {
      payload.notes = form.notes.trim()
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/shelters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          typeof result?.message === 'string'
            ? result.message
            : Array.isArray(result?.message)
              ? result.message.join(', ')
              : 'Unable to create shelter.'

        throw new Error(message)
      }

      setSuccess('Shelter created successfully.')
      onCreated()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to the backend.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100'

  const labelClass =
    'mb-1.5 block text-sm font-medium text-slate-700'

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Create New Shelter
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter the shelter information below.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Close shelter form"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Basic information */}
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Basic information
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="shelter-name">
                Shelter name *
              </label>
              <input
                id="shelter-name"
                className={inputClass}
                maxLength={100}
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Kandy Community Hall"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="shelter-code">
                Shelter code *
              </label>
              <input
                id="shelter-code"
                className={inputClass}
                maxLength={30}
                required
                value={form.shelterCode}
                onChange={(e) =>
                  updateField('shelterCode', e.target.value)
                }
                placeholder="e.g. KDY-SH-001"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="shelter-capacity">
                Maximum capacity *
              </label>
              <input
                id="shelter-capacity"
                className={inputClass}
                type="number"
                min={1}
                step={1}
                required
                value={form.maximumCapacity}
                onChange={(e) =>
                  updateField('maximumCapacity', e.target.value)
                }
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="shelter-address">
                Street address *
              </label>
              <input
                id="shelter-address"
                className={inputClass}
                maxLength={250}
                required
                value={form.address}
                onChange={(e) =>
                  updateField('address', e.target.value)
                }
                placeholder="Enter the full address"
              />
            </div>
          </div>
        </div>

        {/* Location selection */}
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Location
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Province */}
            <div>
              <label className={labelClass} htmlFor="shelter-province">
                Province *
              </label>
              <select
                id="shelter-province"
                className={inputClass}
                value={selectedProvince}
                required
                onChange={(e) => {
                  const value = e.target.value

                  setSelectedProvince(value)
                  setSelectedDistrict('')
                  setSelectedCity('')

                  setForm((previous) => ({
                    ...previous,
                    province: value,
                    district: '',
                    city: '',
                    latitude: '',
                    longitude: '',
                  }))
                }}
              >
                <option value="">Select province</option>
                {SRI_LANKA_LOCATIONS.map((province) => (
                  <option key={province.name} value={province.name}>
                    {province.name}
                  </option>
                ))}
              </select>
            </div>

            {/* District */}
            <div>
              <label className={labelClass} htmlFor="shelter-district">
                District *
              </label>
              <select
                id="shelter-district"
                className={inputClass}
                value={selectedDistrict}
                required
                disabled={!provinceOption}
                onChange={(e) => {
                  const value = e.target.value

                  setSelectedDistrict(value)
                  setSelectedCity('')

                  setForm((previous) => ({
                    ...previous,
                    district: value,
                    city: '',
                    latitude: '',
                    longitude: '',
                  }))
                }}
              >
                <option value="">Select district</option>
                {provinceOption?.districts.map((district) => (
                  <option key={district.name} value={district.name}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className={labelClass} htmlFor="shelter-city">
                City *
              </label>
              <select
                id="shelter-city"
                className={inputClass}
                value={selectedCity}
                required
                disabled={!districtOption}
                onChange={(e) => {
                  const value = e.target.value

                  setSelectedCity(value)

                  setForm((previous) => ({
                    ...previous,
                    city: value,
                    latitude: '',
                    longitude: '',
                  }))
                }}
              >
                <option value="">Select city</option>
                {districtOption?.cities.map((city) => (
                  <option key={city.name} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Operational status */}
            <div>
              <label className={labelClass} htmlFor="shelter-status">
                Operational status
              </label>
              <select
                id="shelter-status"
                className={inputClass}
                value={form.operationalStatus}
                onChange={(e) =>
                  updateField('operationalStatus', e.target.value)
                }
              >
                {OPERATIONAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Latitude */}
            <div>
              <label className={labelClass} htmlFor="shelter-latitude">
                Latitude (optional)
              </label>
              <input
                id="shelter-latitude"
                className={inputClass}
                type="number"
                min={-90}
                max={90}
                step="any"
                value={form.latitude}
                onChange={(e) =>
                  updateField('latitude', e.target.value)
                }
                placeholder="Select a point on the map"
              />
            </div>

            {/* Longitude */}
            <div>
              <label className={labelClass} htmlFor="shelter-longitude">
                Longitude (optional)
              </label>
              <input
                id="shelter-longitude"
                className={inputClass}
                type="number"
                min={-180}
                max={180}
                step="any"
                value={form.longitude}
                onChange={(e) =>
                  updateField('longitude', e.target.value)
                }
                placeholder="Select a point on the map"
              />
            </div>

            {/* Interactive map */}
            <div className="sm:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-700">
                  Select Shelter Location on Map
                </label>

                {(form.latitude || form.longitude) && (
                  <button
                    type="button"
                    onClick={clearCoordinates}
                    className="text-sm font-medium text-teal-700 hover:text-teal-900"
                  >
                    Clear coordinates
                  </button>
                )}
              </div>

              <LocationPicker
                latitude={
                  form.latitude.trim() !== ''
                    ? Number(form.latitude)
                    : undefined
                }
                longitude={
                  form.longitude.trim() !== ''
                    ? Number(form.longitude)
                    : undefined
                }
                mapCenter={selectedMapCenter}
                mapZoom={selectedMapZoom}
                onLocationChange={(latitude, longitude) => {
                  setForm((previous) => ({
                    ...previous,
                    latitude: latitude.toString(),
                    longitude: longitude.toString(),
                  }))
                }}
              />
            </div>
          </div>
        </div>

        {/* Facilities */}
        <div>
          <label className={labelClass} htmlFor="shelter-facilities">
            Facilities (optional)
          </label>
          <input
            id="shelter-facilities"
            className={inputClass}
            value={form.facilities}
            onChange={(e) =>
              updateField('facilities', e.target.value)
            }
            placeholder="e.g. Water, Toilets, First Aid"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Separate facilities with commas.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className={labelClass} htmlFor="shelter-notes">
            Notes (optional)
          </label>
          <textarea
            id="shelter-notes"
            className={inputClass}
            rows={3}
            maxLength={1000}
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Additional information about this shelter"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && (
              <LoaderCircle size={17} className="animate-spin" />
            )}
            {isSubmitting ? 'Creating shelter...' : 'Create Shelter'}
          </button>
        </div>
      </form>
    </section>
  )
}
