import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { EventPostsResponse } from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);

  getPosts(eventId: number): Observable<EventPostsResponse> {
    return this.http.get<EventPostsResponse>(`${API_BASE_URL}/events/${eventId}/posts`);
  }
}
