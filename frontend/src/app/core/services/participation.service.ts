import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { EventSummary } from '../models/event.model';
import { ParticipationResponse, ParticipationStatus } from '../models/participation.model';
import { MyEventsWhen } from '../models/participation.model'
const FEED_SIZE = 10;

@Injectable({ providedIn: 'root' })
export class ParticipationService {
  private readonly http = inject(HttpClient);

  getFeed(size = FEED_SIZE): Observable<EventSummary[]> {
    const params = new HttpParams().set('size', size);
    return this.http.get<EventSummary[]>(`${API_BASE_URL}/participation/feed`, { params });
  }

  getParticipation(eventId: number): Observable<ParticipationResponse> {
    return this.http.get<ParticipationResponse>(`${API_BASE_URL}/events/${eventId}/participation`);
  }


  getMyEvents(when: MyEventsWhen): Observable<EventSummary[]> {
    const params = new HttpParams().set('when', when);
    return this.http.get<EventSummary[]>(`${API_BASE_URL}/me/events`, { params });
  }


  removeParticipation(eventId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/events/${eventId}/participation`);
  }

  setStatus(eventId: number, status: ParticipationStatus): Observable<ParticipationResponse> {
    return this.http.put<ParticipationResponse>(`${API_BASE_URL}/events/${eventId}/participation`, {
      status,
    });
  }
}
