
import { useEffect, useState, type FormEvent } from 'react'
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

export interface ShelterToEdit {
  _id?: string
  id?: string
  name: string
  shelterCode: string
  address: string
  city: string
  district: string
  province: string
  latitude?: number
  longitude?: number
  maximumCapacity: number
  operationalStatus: OperationalStatus
  facilities?: string[]
  notes?: string
}

interface EditShelterFormProps {
  shelter: ShelterToEdit
  token: string
  onUpdated: () => void
  onCancel: () => void
}

export default function EditShelterForm({
  shelter,
  token,
  onUpdated,
  onCancel,
}: EditShelterFormProps) {
  const [form, setForm] = useState({
    name: shelter.name ?? '',
    shelterCode: shelter.shelterCode ?? '',
    address: shelter.address ?? '',
    city: shelter.city ?? '',
    district: shelter.district ?? '',
    province: shelter.province ?? '',
    latitude: shelter.latitude?.toString() ?? '',
    longitude: shelter.longitude?.toString() ?? '',
    maximumCapacity: String(shelter.maximumCapacity ?? 1),
    operationalStatus: shelter.operationalStatus ?? 'OPEN',
    facilities: Array.isArray(shelter.facilities)
      ? shelter.facilities.join(', ')
      : '',
    notes: shelter.notes ?? '',
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedProvince, setSelectedProvince] = useState(
    shelter.province ?? '',
  )
  const [selectedDistrict, setSelectedDistrict] = useState(
    shelter.district ?? '',
  )
  const [selectedCity, setSelectedCity] = useState(shelter.city ?? '')

  const provinceOption = SRI_LANKA_LOCATIONS.find(
    (province) => province.name === selectedProvince,
  )

  const districtOption = provinceOption?.districts.find(
    (district) => district.name === selectedDistrict,
  )

  const cityOption = districtOption?.cities.find(
    (city) => city.name === selectedCity,
  )

  const defaultCenter: [number, number] = [7.8731, 80.7718]

  const mapCenter: [number, number] =
    cityOption?.center ??
    districtOption?.center ??
    provinceOption?.center ??
    (shelter.latitude !== undefined &&
    shelter.longitude !== undefined
      ? [shelter.latitude, shelter.longitude]
      : defaultCenter)

  const mapZoom =
    cityOption?.zoom ??
    districtOption?.zoom ??
    provinceOption?.zoom ??
    7

  // REVIEW [Smell]: keeps province/district/city in two states and syncs them with an effect - store them only in `form` like CreateShelterForm.
  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      province: selectedProvince,
      district: selectedDistrict,
      city: selectedCity,
    }))
  }, [selectedProvince, selectedDistrict, selectedCity])

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const id = shelter._id ?? shelter.id

    if (!id) {
      setError('Shelter ID is missing. Cannot update this shelter.')
      return
    }

    // REVIEW [DRY]: coordinate and capacity validation is copied from CreateShelterForm.
    const latitudeText = form.latitude.trim()
    const longitudeText = form.longitude.trim()

    if (Boolean(latitudeText) !== Boolean(longitudeText)) {
      setError('Enter both latitude and longitude, or leave both empty.')
      return
    }

    let latitude: number | undefined
    let longitude: number | undefined

    if (latitudeText && longitudeText) {
      latitude = Number(latitudeText)
      longitude = Number(longitudeText)

      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        setError('Enter valid latitude and longitude values.')
        return
      }
    }

    const maximumCapacity = Number(form.maximumCapacity)

    if (!Number.isInteger(maximumCapacity) || maximumCapacity < 1) {
      setError('Maximum capacity must be a whole number greater than zero.')
      return
    }

    const facilities = form.facilities
      .split(',')
      .map((facility) => facility.trim())
      .filter(Boolean)

    const payload = {
      name: form.name.trim(),
      shelterCode: form.shelterCode.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      province: form.province.trim(),
      maximumCapacity,
      operationalStatus: form.operationalStatus,
      facilities,
      notes: form.notes.trim(),
      ...(latitude !== undefined && longitude !== undefined
        ? { latitude, longitude }
        : {}),
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(
        `${API_URL}/shelters/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      )

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          typeof result?.message === 'string'
            ? result.message
            : Array.isArray(result?.message)
              ? result.message.join(', ')
              : `Unable to update shelter (HTTP ${response.status}).`

        throw new Error(message)
      }

      setSuccess('Shelter updated successfully.')
      onUpdated()
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
            Edit Shelter
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Update the information for {shelter.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Close edit form"
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

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Basic information
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="edit-shelter-name">
                Shelter name *
              </label>
              <input
                id="edit-shelter-name"
                className={inputClass}
                maxLength={100}
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-shelter-code">
                Shelter code *
              </label>
              <input
                id="edit-shelter-code"
                className={inputClass}
                maxLength={30}
                required
                value={form.shelterCode}
                onChange={(e) =>
                  updateField('shelterCode', e.target.value)
                }
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-shelter-capacity">
                Maximum capacity *
              </label>
              <input
                id="edit-shelter-capacity"
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
              <label className={labelClass} htmlFor="edit-shelter-address">
                Street address *
              </label>
              <input
                id="edit-shelter-address"
                className={inputClass}
                maxLength={250}
                required
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Location
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="edit-province">
                Province *
              </label>
              <select
                id="edit-province"
                className={inputClass}
                required
                value={selectedProvince}
                onChange={(e) => {
                  const value = e.target.value
                  setSelectedProvince(value)
                  setSelectedDistrict('')
                  setSelectedCity('')
                  updateField('latitude', '')
                  updateField('longitude', '')
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

            <div>
              <label className={labelClass} htmlFor="edit-district">
                District *
              </label>
              <select
                id="edit-district"
                className={inputClass}
                required
                disabled={!provinceOption}
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value)
                  setSelectedCity('')
                  updateField('latitude', '')
                  updateField('longitude', '')
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

            <div>
              <label className={labelClass} htmlFor="edit-city">
                City *
              </label>
              <select
                id="edit-city"
                className={inputClass}
                required
                disabled={!districtOption}
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value)
                  updateField('latitude', '')
                  updateField('longitude', '')
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

            <div>
              <label className={labelClass} htmlFor="edit-status">
                Operational status *
              </label>
              <select
                id="edit-status"
                className={inputClass}
                required
                value={form.operationalStatus}
                onChange={(e) =>
                  updateField('operationalStatus', e.target.value)
                }
              >
                {OPERATIONAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === 'MAINTENANCE'
                      ? 'Under Maintenance'
                      : status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-latitude">
                Latitude (optional)
              </label>
              <input
                id="edit-latitude"
                className={inputClass}
                type="number"
                min={-90}
                max={90}
                step="any"
                value={form.latitude}
                onChange={(e) => updateField('latitude', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="edit-longitude">
                Longitude (optional)
              </label>
              <input
                id="edit-longitude"
                className={inputClass}
                type="number"
                min={-180}
                max={180}
                step="any"
                value={form.longitude}
                onChange={(e) => updateField('longitude', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>
                Select Shelter Location on Map
              </label>
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
                mapCenter={mapCenter}
                mapZoom={mapZoom}
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

        <div>
          <label className={labelClass} htmlFor="edit-facilities">
            Facilities (optional)
          </label>
          <input
            id="edit-facilities"
            className={inputClass}
            value={form.facilities}
            onChange={(e) => updateField('facilities', e.target.value)}
            placeholder="Water, Toilets, First Aid"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Separate facilities with commas.
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="edit-notes">
            Notes (optional)
          </label>
          <textarea
            id="edit-notes"
            className={inputClass}
            rows={3}
            maxLength={1000}
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </div>

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
            {isSubmitting ? 'Saving changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </section>
  )
}
