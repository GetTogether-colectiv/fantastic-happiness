import * as L from 'leaflet';
import {
  LocatedEvent,
  coordinatesOf,
  createCategoryIcon,
  hasLocation,
  toLatLng,
  toMapArea,
} from './map.utils';

const EVENT: LocatedEvent = {
  id: 1,
  title: 'Cluj JS Meetup',
  category: 'TECH',
  startsAt: '2030-01-01T18:00:00Z',
  endsAt: '2030-01-01T21:00:00Z',
  city: 'Cluj-Napoca',
  locationName: 'Form Space',
  latitude: 46.7742,
  longitude: 23.5788,
  imageUrl: null,
  capacity: 150,
  goingCount: 0,
};

describe('map utils', () => {
  it('knows when an event has a map position', () => {
    expect(hasLocation(EVENT)).toBe(true);
    expect(hasLocation({ ...EVENT, latitude: null, longitude: null })).toBe(false);
  });

  it('gives the coordinates of an event, or null when it has none', () => {
    expect(coordinatesOf(EVENT)).toEqual({ latitude: 46.7742, longitude: 23.5788 });
    expect(coordinatesOf({ ...EVENT, latitude: null, longitude: null })).toBeNull();
  });

  it('turns an event into Leaflet coordinates', () => {
    expect(toLatLng(EVENT)).toEqual([46.7742, 23.5788]);
  });

  it('turns the visible part of the map into an area', () => {
    const bounds = L.latLngBounds([46.7, 23.5], [46.8, 23.7]);

    expect(toMapArea(bounds)).toEqual({
      minLatitude: 46.7,
      maxLatitude: 46.8,
      minLongitude: 23.5,
      maxLongitude: 23.7,
    });
  });

  it('keeps the area inside the valid range when the whole world is visible', () => {
    const bounds = L.latLngBounds([-120, -400], [120, 400]);

    expect(toMapArea(bounds)).toEqual({
      minLatitude: -90,
      maxLatitude: 90,
      minLongitude: -180,
      maxLongitude: 180,
    });
  });

  it('shows the category icon on the pin', () => {
    const html = String(createCategoryIcon('TECH').options.html);

    expect(html).toContain('computer');
  });
});
