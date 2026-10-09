
import { useEffect } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718]

export interface LocationPickerProps {
  latitude?: number
  longitude?: number
  mapCenter?: [number, number]
  mapZoom?: number
  onLocationChange: (
    latitude: number,
    longitude: number,
  ) => void
}

interface MapInteractionProps {
  onLocationChange: (
    latitude: number,
    longitude: number,
  ) => void
}

function MapInteraction({
  onLocationChange,
}: MapInteractionProps) {
  useMapEvents({
    click(event) {
      onLocationChange(
        event.latlng.lat,
        event.latlng.lng,
      )
    },
  })

  return null
}

interface MapUpdaterProps {
  center: [number, number]
  zoom: number
}

function MapUpdater({ center, zoom }: MapUpdaterProps) {
  const map = useMap()

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 })
  }, [map, center, zoom])

  return null
}

export default function LocationPicker({
  latitude,
  longitude,
  mapCenter = SRI_LANKA_CENTER,
  mapZoom = 7,
  onLocationChange,
}: LocationPickerProps) {
  const hasCoordinates =
    latitude !== undefined &&
    longitude !== undefined &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)

  const markerPosition: [number, number] | null =
    hasCoordinates ? [latitude, longitude] : null

  const markerIcon = L.divIcon({
    className: '',
    html: `
      <div style="
        width: 22px;
        height: 22px;
        background: #0d9488;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px #0004;
      "></div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom
          className="h-80 w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapUpdater center={mapCenter} zoom={mapZoom} />

          <MapInteraction
            onLocationChange={onLocationChange}
          />

          {markerPosition && (
            <Marker
              position={markerPosition}
              icon={markerIcon}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-sm text-slate-500">
        Select a location on the map to set the shelter
        coordinates. Use the mouse wheel or map controls
        to zoom in for better accuracy.
      </p>

      {hasCoordinates && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-teal-50 p-3">
            <p className="text-xs font-medium text-teal-700">
              Latitude
            </p>
            <p className="mt-1 font-mono text-sm text-slate-800">
              {latitude.toFixed(6)}
            </p>
          </div>

          <div className="rounded-lg bg-teal-50 p-3">
            <p className="text-xs font-medium text-teal-700">
              Longitude
            </p>
            <p className="mt-1 font-mono text-sm text-slate-800">
              {longitude.toFixed(6)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
