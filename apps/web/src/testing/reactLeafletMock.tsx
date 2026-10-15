import type { ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * Lightweight stand-ins for react-leaflet so components that use the map can be
 * rendered in jsdom. Markers forward clicks to their Leaflet-style handlers and
 * `mapActions` records the camera calls made through `useMap`.
 */
export const mapActions = {
  setView: vi.fn(),
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
}

interface MarkerProps {
  position: [number, number]
  eventHandlers?: { click?: () => void }
  children?: ReactNode
}

export const reactLeafletMock = {
  MapContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ position, eventHandlers, children }: MarkerProps) => (
    <div
      data-testid="marker"
      data-position={position.join(',')}
      onClick={() => eventHandlers?.click?.()}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: { children?: ReactNode }) => (
    <div data-testid="popup" onClick={(event) => event.stopPropagation()}>
      {children}
    </div>
  ),
  Circle: ({ center }: { center: [number, number] }) => (
    <div data-testid="zone" data-center={center.join(',')} />
  ),
  useMap: () => mapActions,
}
