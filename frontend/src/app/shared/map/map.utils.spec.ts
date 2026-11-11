import {
  LocatedEvent,
  coordinatesOf,
  createCategoryIcon,
  hasLocation,
  toLatLng,
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

  it('colors the pin by category and shows the category icon', () => {
    const html = String(createCategoryIcon('TECH').options.html);

    expect(html).toContain('var(--category-tech)');
    expect(html).toContain('computer');
  });
});
