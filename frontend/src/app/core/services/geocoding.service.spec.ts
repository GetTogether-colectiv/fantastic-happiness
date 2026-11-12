import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Address, GeocodingService, NOMINATIM_REVERSE_URL } from './geocoding.service';

const POSITION = { latitude: 46.77, longitude: 23.59 };

describe('GeocodingService', () => {
  let service: GeocodingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GeocodingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function findAddress(): Address[] {
    const results: Address[] = [];
    service.findAddress(POSITION).subscribe((address) => results.push(address));
    return results;
  }

  function expectLookup() {
    return http.expectOne((request) => request.url === NOMINATIM_REVERSE_URL);
  }

  it('asks for the address at the given position', () => {
    findAddress();

    const params = expectLookup().request.params;
    expect(params.get('lat')).toBe('46.77');
    expect(params.get('lon')).toBe('23.59');
    expect(params.get('format')).toBe('jsonv2');
  });

  it('uses the place name and city', () => {
    const results = findAddress();

    expectLookup().flush({
      name: 'Central Park',
      address: { city: 'Cluj-Napoca', road: 'Strada Mihai Eminescu' },
    });

    expect(results).toEqual([{ city: 'Cluj-Napoca', locationName: 'Central Park' }]);
  });

  it('falls back to the street and a smaller settlement', () => {
    const results = findAddress();

    expectLookup().flush({ name: '', address: { village: 'Florești', road: 'Strada Avram Iancu', house_number: '5' } });

    expect(results).toEqual([{ city: 'Florești', locationName: 'Strada Avram Iancu 5' }]);
  });

  it('returns an unknown address when the lookup fails', () => {
    const results = findAddress();

    expectLookup().flush(null, { status: 500, statusText: 'Server Error' });

    expect(results).toEqual([{ city: null, locationName: null }]);
  });
});
