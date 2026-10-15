import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

const API_URL = 'http://localhost:3000/api'

// Modal for logging an incident report with dynamic backend districts
interface CreateIncidentModalProps {
  token: string
  districts: string[]
  defaultDistrict: string
  onCreated: () => void
  onCancel: () => void
}

export default function CreateIncidentModal({
  token,
  districts,
  defaultDistrict,
  onCreated,
  onCancel,
}: CreateIncidentModalProps) {
  const [hazardType, setHazardType] = useState('FLOOD')
  const [customHazard, setCustomHazard] = useState('')
  const [district, setDistrict] = useState(defaultDistrict)
  const [city, setCity] = useState('')
  const [manualLocation, setManualLocation] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMessage('')

    if (!description.trim() && !photo) {
      setErrorMessage('Please provide a description or attach a photo.')
      return
    }

    try {
      setIsSubmitting(true)
      const formData = new FormData()
      formData.append('hazardType', hazardType)
      if (hazardType === 'OTHER' && customHazard) {
        formData.append('customHazardType', customHazard)
      }
      formData.append('district', district)
      if (city) formData.append('city', city)
      if (manualLocation) formData.append('manualLocation', manualLocation)
      if (description) formData.append('description', description)
      if (photo) formData.append('photo', photo)

      const res = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const result = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(result?.message || 'Failed to submit report')
      }

      onCreated()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error submitting report')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Log Disaster Incident Report
            </h3>
            <p className="text-xs text-slate-500">
              Submit a field incident report directly to the database.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700" htmlFor="hazard-type">
              Hazard Type *
            </label>
            <select
              id="hazard-type"
              value={hazardType}
              onChange={(e) => setHazardType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-teal-500"
              required
            >
              <option value="FLOOD">Flood</option>
              <option value="RISING_WATER">Rising Water</option>
              <option value="LANDSLIDE">Landslide</option>
              <option value="LANDSLIDE_CRACK">Landslide Crack</option>
              <option value="BLOCKED_ROAD">Blocked Road</option>
              <option value="STRONG_WIND">Strong Wind</option>
              <option value="FIRE">Fire</option>
              <option value="EARTHQUAKE">Earthquake</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {hazardType === 'OTHER' && (
            <div>
              <label
                className="block text-xs font-semibold text-slate-700"
                htmlFor="custom-hazard"
              >
                Specify Hazard Type *
              </label>
              <input
                id="custom-hazard"
                value={customHazard}
                onChange={(e) => setCustomHazard(e.target.value)}
                placeholder="e.g. Chemical spill, Dam overflow..."
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-teal-500"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-semibold text-slate-700"
                htmlFor="district-select"
              >
                District *
              </label>
              <select
                id="district-select"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                required
              >
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d} District
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="city-input">
                City / Town
              </label>
              <input
                id="city-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Gunnepana, Kandy..."
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-semibold text-slate-700"
              htmlFor="manual-location"
            >
              Specific Location / Landmark
            </label>
            <input
              id="manual-location"
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              placeholder="e.g. Near Main Junction, Kelani River bank, Hospital road..."
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700" htmlFor="report-desc">
              Incident Description *
            </label>
            <textarea
              id="report-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide complete details about observed water levels, damage, casualties or risks..."
              className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700" htmlFor="report-photo">
              Upload Verification Photo (Optional)
            </label>
            <input
              id="report-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="mt-1 w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
