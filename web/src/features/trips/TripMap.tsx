import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

// OpenStreetMap's standard tiles (attribution required by their policy),
// toned down in CSS (.leaflet-tile-pane) to sit quietly behind the UI. OSM's
// tile servers suit light use; production traffic needs a tile provider.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// A CSS pin instead of Leaflet's default PNG marker, whose image paths break
// under bundlers.
export const pinIcon = L.divIcon({ className: "pin-icon", html: '<div class="pin"></div>', iconAnchor: [15, 34], iconSize: [30, 30] });

export type LatLng = { lat: number; lng: number };

function Recenter({ center, zoom }: { center: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], zoom, { duration: 0.6 });
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

function ClickToPick({ onPick }: { onPick: (point: LatLng) => void }) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

export function TripMap({
  center,
  interactive = true,
  marker,
  onPick,
  zoom = 10
}: {
  center: LatLng;
  interactive?: boolean;
  marker?: LatLng;
  onPick?: (point: LatLng) => void;
  zoom?: number;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      keyboard={interactive}
      zoomControl={interactive}
      attributionControl
    >
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
      {marker ? <Marker position={[marker.lat, marker.lng]} icon={pinIcon} keyboard={false} /> : null}
      <Recenter center={center} zoom={zoom} />
      {onPick ? <ClickToPick onPick={onPick} /> : null}
    </MapContainer>
  );
}
