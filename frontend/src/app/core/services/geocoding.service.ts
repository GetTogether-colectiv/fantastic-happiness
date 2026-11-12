import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { Coordinates } from '../models/event.model';

export const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const STREET_LEVEL_ZOOM = 18;
const ADDRESS_LANGUAGE = 'en';

export interface Address {
  city: string | null;
  locationName: string | null;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  road?: string;
  house_number?: string;
}

interface NominatimReverseResponse {
  name?: string;
  address?: NominatimAddress;
}

const UNKNOWN_ADDRESS: Address = { city: null, locationName: null };

function toAddress(response: NominatimReverseResponse): Address {
  const address = response.address ?? {};
  const street = [address.road, address.house_number].filter(Boolean).join(' ');
  return {
    city: address.city ?? address.town ?? address.village ?? address.municipality ?? null,
    locationName: response.name || street || null,
  };
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);

  findAddress(position: Coordinates): Observable<Address> {
    const params = new HttpParams()
      .set('format', 'jsonv2')
      .set('lat', position.latitude)
      .set('lon', position.longitude)
      .set('zoom', STREET_LEVEL_ZOOM)
      .set('accept-language', ADDRESS_LANGUAGE);
    return this.http.get<NominatimReverseResponse>(NOMINATIM_REVERSE_URL, { params }).pipe(
      map(toAddress),
      catchError(() => of(UNKNOWN_ADDRESS)),
    );
  }
}
