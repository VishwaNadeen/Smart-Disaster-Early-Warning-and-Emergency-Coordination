
import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { Building2, MapPin, Users } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

export interface MapShelter {
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
  currentOccupancy?: number
  operationalStatus: string
  isActive?: boolean
  facilities?: string[]
  notes?: string
}

interface ShelterMapProps {
  shelters: MapShelter[]
}

const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718]

function getShelterId(shelter: MapShelter) {
  return shelter._id ?? shelter.id ?? shelter.shelterCode
}

function hasValidCoordinates(shelter: MapShelter) {
  if (shelter.latitude == null || shelter.longitude == null) {
    return false
  }

  const latitude = Number(shelter.latitude)
  const longitude = Number(shelter.longitude)

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

function getMarkerIcon(status: string, selected: boolean) {
  const color =
    status === 'OPEN'
      ? '#16a34a'
      : status === 'CLOSED'
        ? '#dc2626'
        : status === 'MAINTENANCE'
          ? '#d97706'
          : '#64748b'

  const size = selected ? 28 : 22

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${color};
      border:${selected ? '4px solid #0f766e' : '3px solid white'};
      box-sizing:border-box;
      box-shadow:0 2px 7px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function FitShelterBounds({
  shelters,
  selectedShelter,
}: {
  shelters: MapShelter[]
  selectedShelter: MapShelter | null
}) {
  const map = useMap()

  const coordinates = useMemo(
    () =>
      shelters
        .filter(hasValidCoordinates)
        .map(
          (shelter) =>
            [
              Number(shelter.latitude),
              Number(shelter.longitude),
            ] as [number, number],
        ),
    [shelters],
  )

  useEffect(() => {
    if (selectedShelter && hasValidCoordinates(selectedShelter)) {
      map.flyTo(
        [
          Number(selectedShelter.latitude),
          Number(selectedShelter.longitude),
        ],
        Math.max(map.getZoom(), 12),
        { duration: 0.5 },
      )
      return
    }

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 12)
    } else if (coordinates.length > 1) {
      map.fitBounds(coordinates, {
        padding: [30, 30],
        maxZoom: 13,
      })
    } else {
      map.setView(SRI_LANKA_CENTER, 7)
    }
  }, [coordinates, map, selectedShelter])

  return null
}

export default function ShelterMap({ shelters }: ShelterMapProps) {
  const [selectedShelter, setSelectedShelter] =
    useState<MapShelter | null>(null)

  const mappedShelters = useMemo(
    () => shelters.filter(hasValidCoordinates),
    [shelters],
  )

  useEffect(() => {
    if (!selectedShelter) return

    const updatedShelter = shelters.find(
      (shelter) =>
        getShelterId(shelter) === getShelterId(selectedShelter),
    )

    if (!updatedShelter) {
      setSelectedShelter(null)
    } else if (updatedShelter !== selectedShelter) {
      setSelectedShelter(updatedShelter)
    }
  }, [shelters, selectedShelter])

  const occupancy = Number(selectedShelter?.currentOccupancy ?? 0)
  const capacity = Number(selectedShelter?.maximumCapacity ?? 0)
  const available = Math.max(capacity - occupancy, 0)
  const utilization =
    capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0

  const statusClass =
    selectedShelter?.operationalStatus === 'OPEN'
      ? 'bg-green-100 text-green-700'
      : selectedShelter?.operationalStatus === 'MAINTENANCE'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700'

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <h3 className="font-bold text-slate-900">Shelter Locations</h3>
        <p className="mt-1 text-sm text-slate-500">
          Select a map marker to view the shelter's details.
        </p>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-600" />
            Open
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-600" />
            Closed
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-600" />
            Maintenance
          </span>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
          {selectedShelter ? (
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-teal-100 p-3 text-teal-700">
                  <Building2 size={23} />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="break-words font-bold text-slate-900">
                    {selectedShelter.name}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedShelter.shelterCode}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Clear selected shelter"
                  onClick={() => setSelectedShelter(null)}
                  className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-white"
                >
                  ×
                </button>
              </div>

              <span
                className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
              >
                {selectedShelter.operationalStatus.replaceAll('_', ' ')}
              </span>

              {selectedShelter.isActive === false && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  This shelter is inactive.
                </p>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Address
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {selectedShelter.address}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedShelter.city}, {selectedShelter.district}
                  </p>
                  <p className="text-sm text-slate-600">
                    {selectedShelter.province} Province
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users size={18} />
                    <span className="text-sm font-medium">Occupancy</span>
                  </div>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {occupancy.toLocaleString()}
                    <span className="text-sm font-normal text-slate-500">
                      {' '}/ {capacity.toLocaleString()}
                    </span>
                  </p>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        occupancy > capacity
                          ? 'bg-red-600'
                          : utilization >= 90
                            ? 'bg-amber-500'
                            : 'bg-teal-600'
                      }`}
                      style={{
                        width: `${Math.min(utilization, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between gap-2 text-xs text-slate-500">
                    <span>Utilization</span>
                    <span>{utilization}%</span>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-sm text-slate-600">
                      Available spaces:{' '}
                      <strong className="text-slate-900">
                        {available.toLocaleString()}
                      </strong>
                    </p>
                  </div>
                </div>

                {occupancy > capacity && (
                  <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    Occupancy exceeds registered capacity. Review this
                    shelter's status.
                  </p>
                )}

                {selectedShelter.facilities &&
                  selectedShelter.facilities.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Facilities
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedShelter.facilities.map((facility) => (
                          <span
                            key={facility}
                            className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200"
                          >
                            {facility}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedShelter.notes && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Notes
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {selectedShelter.notes}
                    </p>
                  </div>
                )}

                {hasValidCoordinates(selectedShelter) && (
                  <p className="text-xs text-slate-400">
                    Coordinates: {selectedShelter.latitude},{' '}
                    {selectedShelter.longitude}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center lg:min-h-[480px]">
              <div className="rounded-full bg-white p-4 text-teal-700 ring-1 ring-slate-200">
                <MapPin size={28} />
              </div>
              <h4 className="mt-4 font-semibold text-slate-800">
                Select a shelter
              </h4>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                Click a marker to see its address, status, occupancy,
                capacity, and facilities in this panel.
              </p>
              <p className="mt-4 text-xs text-slate-400">
                {mappedShelters.length} shelter marker(s) available
              </p>
            </div>
          )}
        </aside>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">
              Interactive map
            </p>
            <p className="text-xs text-slate-500">
              {mappedShelters.length} mapped / {shelters.length} total
            </p>
          </div>

          <div className="h-[480px] w-full">
            <MapContainer
              center={SRI_LANKA_CENTER}
              zoom={7}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitShelterBounds
                shelters={mappedShelters}
                selectedShelter={selectedShelter}
              />

              {mappedShelters.map((shelter, index) => {
                const id = getShelterId(shelter) ?? String(index)
                const selected =
                  !!selectedShelter &&
                  getShelterId(selectedShelter) === id

                return (
                  <Marker
                    key={id}
                    position={[
                      Number(shelter.latitude),
                      Number(shelter.longitude),
                    ]}
                    icon={getMarkerIcon(
                      shelter.operationalStatus,
                      selected,
                    )}
                    eventHandlers={{
                      click: () => setSelectedShelter(shelter),
                    }}
                  >
                    <Popup>
                      <div className="min-w-40 space-y-1 text-sm">
                        <p className="font-bold">{shelter.name}</p>
                        <p>{shelter.shelterCode}</p>
                        <p>
                          {shelter.city}, {shelter.district}
                        </p>
                        <p>Status: {shelter.operationalStatus}</p>
                        <p>
                          Occupancy: {shelter.currentOccupancy ?? 0} /{' '}
                          {shelter.maximumCapacity}
                        </p>
                        <p className="pt-1 font-medium text-teal-700">
                          Full details are shown in the left panel.
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>
        </div>
      </div>

      {mappedShelters.length < shelters.length && (
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-amber-700">
          {shelters.length - mappedShelters.length} shelter(s) cannot be
          mapped because their coordinates are missing or invalid.
        </p>
      )}
    </section>
  )
}
