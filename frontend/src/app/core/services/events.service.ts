import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { EventDetails, EventFilter, EventSummary, Page } from '../models/event.model';

const DEFAULT_PAGE_SIZE = 10;

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

  getEvent(id: number): Observable<EventDetails> {
    return this.http.get<EventDetails>(`${API_BASE_URL}/events/${id}`);
  }
}
