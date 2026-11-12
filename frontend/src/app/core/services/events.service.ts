import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import {
  EventCategory,
  EventDetails,
  EventFilter,
  EventRequest,
  EventSummary,
  MapArea,
  Page,
} from '../models/event.model';

const DEFAULT_PAGE_SIZE = 10;
const MAP_AREA_LIMIT = 200;

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);

  getEvents(filter: EventFilter = {}, page = 0, size = DEFAULT_PAGE_SIZE): Observable<Page<EventSummary>> {
    let params = new HttpParams().set('page', page).set('size', size);
    for (const [name, value] of Object.entries(filter)) {
      if (value) {
        params = params.set(name, value);
      }
    }
    return this.http.get<Page<EventSummary>>(`${API_BASE_URL}/events`, { params });
  }

  getEventsInArea(area: MapArea, category?: EventCategory): Observable<Page<EventSummary>> {
    let params = new HttpParams()
      .set('minLatitude', area.minLatitude)
      .set('maxLatitude', area.maxLatitude)
      .set('minLongitude', area.minLongitude)
      .set('maxLongitude', area.maxLongitude)
      .set('size', MAP_AREA_LIMIT);
    if (category) {
      params = params.set('category', category);
    }
    return this.http.get<Page<EventSummary>>(`${API_BASE_URL}/events`, { params });
  }

  getEvent(id: number): Observable<EventDetails> {
    return this.http.get<EventDetails>(`${API_BASE_URL}/events/${id}`);
  }

  createEvent(request: EventRequest): Observable<EventDetails> {
    return this.http.post<EventDetails>(`${API_BASE_URL}/events`, request);
  }

  updateEvent(id: number, request: EventRequest): Observable<EventDetails> {
    return this.http.put<EventDetails>(`${API_BASE_URL}/events/${id}`, request);
  }
}
