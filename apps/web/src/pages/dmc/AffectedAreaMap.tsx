import { Fragment, useEffect, useMemo } from 'react'
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  SRI_LANKA_CENTER,
  SRI_LANKA_DISTRICTS,
} from './sriLankaDistricts'
import type { MapShelter } from './ShelterMap'

export interface IncidentLocation {
  latitude: number
  longitude: number
  label: string
}

interface AffectedAreaMapProps {
  selectedDistricts: string[]
  onToggleDistrict: (district: string) => void
  onAddCity: (city: string) => void
  shelters?: MapShelter[]
  incident?: IncidentLocation | null
  height?: number
}

const DISTRICT_RADIUS_METERS = 22000

function dotIcon(color: string, size: number, ring = '#ffffff') {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid ${ring};box-sizing:border-box;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const incidentIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;background:#f59e0b;border:3px solid #fff;transform:rotate(45deg);box-sizing:border-box;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function hasCoordinates(shelter: MapShelter) {
  return (
    shelter.latitude != null &&
    shelter.longitude != null &&
    Number.isFinite(Number(shelter.latitude)) &&
    Number.isFinite(Number(shelter.longitude))
  )
}

function FitToSelection({
  selectedDistricts,
  incident,
}: {
  selectedDistricts: string[]
  incident?: IncidentLocation | null
}) {
  const map = useMap()

  const points = useMemo(() => {
    const list: [number, number][] = selectedDistricts
      .map((name) => SRI_LANKA_DISTRICTS[name])
      .filter(Boolean)
      .map((d) => [d.lat, d.lng])
    if (incident) list.push([incident.latitude, incident.longitude])
    return list
  }, [selectedDistricts, incident])

  useEffect(() => {
    if (points.length === 0) {
      map.setView(SRI_LANKA_CENTER, 7)
    } else if (points.length === 1) {
      map.flyTo(points[0], 9, { duration: 0.5 })
    } else {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 10 })
    }
  }, [points, map])

  return null
}

export default function AffectedAreaMap({
  selectedDistricts,
  onToggleDistrict,
  onAddCity,
  shelters = [],
  incident,
  height = 420,
}: AffectedAreaMapProps) {
  const mappedShelters = useMemo(
    () => shelters.filter(hasCoordinates),
    [shelters],
  )

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div style={{ height }} className="w-full">
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
          <FitToSelection
            selectedDistricts={selectedDistricts}
            incident={incident}
          />

          {Object.values(SRI_LANKA_DISTRICTS).map((district) => {
            const selected = selectedDistricts.includes(district.name)
            return (
              <Fragment key={district.name}>
                {selected && (
                  <Circle
                    center={[district.lat, district.lng]}
                    radius={DISTRICT_RADIUS_METERS}
                    pathOptions={{
                      color: '#dc2626',
                      fillColor: '#ef4444',
                      fillOpacity: 0.18,
                      weight: 2,
                    }}
                  />
                )}
                <Marker
                  position={[district.lat, district.lng]}
                  icon={dotIcon(
                    selected ? '#dc2626' : '#64748b',
                    selected ? 22 : 16,
                  )}
                  eventHandlers={{
                    click: () => onToggleDistrict(district.name),
                  }}
                >
                  <Popup>
                    <div className="min-w-44 space-y-2 text-xs">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {district.name}
                        </p>
                        <p className="text-slate-500">
                          {district.province} Province
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {district.popularCities.map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => onAddCity(city)}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 hover:bg-red-50 hover:text-red-700"
                          >
                            + {city}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleDistrict(district.name)}
                        className={`w-full rounded py-1 font-semibold ${
                          selected
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {selected ? 'Remove district' : 'Add district'}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              </Fragment>
            )
          })}

          {mappedShelters.map((shelter, index) => (
            <Marker
              key={shelter._id ?? shelter.id ?? shelter.shelterCode ?? index}
              position={[Number(shelter.latitude), Number(shelter.longitude)]}
              icon={dotIcon(
                shelter.operationalStatus === 'OPEN' ? '#16a34a' : '#94a3b8',
                14,
              )}
            >
              <Popup>
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-slate-900">{shelter.name}</p>
                  <p>
                    {shelter.city}, {shelter.district}
                  </p>
                  <p>
                    {shelter.operationalStatus} · Capacity{' '}
                    {shelter.maximumCapacity}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {incident && (
            <Marker
              position={[incident.latitude, incident.longitude]}
              icon={incidentIcon}
            >
              <Popup>
                <p className="text-xs font-semibold">{incident.label}</p>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Affected
          district
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> District
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Open
          shelter
        </span>
        {incident && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 bg-amber-500" /> Reported
            incident
          </span>
        )}
      </div>
    </div>
  )
}
