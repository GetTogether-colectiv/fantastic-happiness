import * as L from 'leaflet';
import {
  CATEGORY_ICONS,
  Coordinates,
  EventCategory,
  EventSummary,
  MapArea,
} from '../../core/models/event.model';

export const CLUJ_NAPOCA_CENTER: L.LatLngTuple = [46.7693, 23.5899];
export const CITY_ZOOM = 13;

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const OSM_MAX_ZOOM = 19;

const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

const PIN_SIZE: L.PointTuple = [32, 32];
const PIN_TIP: L.PointTuple = [16, 32];

// angular.json copies Leaflet's default marker images to /leaflet, so the default marker can find them.
L.Icon.Default.imagePath = 'leaflet/';

export type LocatedEvent = EventSummary & Coordinates;

export function hasLocation(event: EventSummary): event is LocatedEvent {
  return event.latitude !== null && event.longitude !== null;
}

export function coordinatesOf(event: EventSummary): Coordinates | null {
  return hasLocation(event) ? { latitude: event.latitude, longitude: event.longitude } : null;
}

export function toLatLng(position: Coordinates): L.LatLngTuple {
  return [position.latitude, position.longitude];
}

export function toCoordinates(position: L.LatLng): Coordinates {
  return { latitude: position.lat, longitude: position.lng };
}

export function toMapArea(bounds: L.LatLngBounds): MapArea {
  return {
    minLatitude: Math.max(bounds.getSouth(), MIN_LATITUDE),
    maxLatitude: Math.min(bounds.getNorth(), MAX_LATITUDE),
    minLongitude: Math.max(bounds.getWest(), MIN_LONGITUDE),
    maxLongitude: Math.min(bounds.getEast(), MAX_LONGITUDE),
  };
}

export function addOpenStreetMapTiles(map: L.Map): void {
  L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: OSM_MAX_ZOOM }).addTo(map);
}

export function createCategoryIcon(category: EventCategory): L.DivIcon {
  const color = `var(--category-${category.toLowerCase()})`;
  return L.divIcon({
    className: 'category-pin',
    html: `<span class="category-pin__body" style="--pin-color: ${color}">
             <span class="material-icons" aria-hidden="true">${CATEGORY_ICONS[category]}</span>
           </span>`,
    iconSize: PIN_SIZE,
    iconAnchor: PIN_TIP,
  });
}
