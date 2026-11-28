import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { CreatePostRequest, EventPost, EventPostsResponse } from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);

  getPosts(eventId: number): Observable<EventPostsResponse> {
    return this.http.get<EventPostsResponse>(`${API_BASE_URL}/events/${eventId}/posts`);
  }

  createPost(eventId: number, request: CreatePostRequest): Observable<EventPost> {
    return this.http.post<EventPost>(`${API_BASE_URL}/events/${eventId}/posts`, request);
  }

  /** Sends all files in one multipart request; returns the URLs of all the post's photos. */
  uploadPhotos(postId: number, files: File[]): Observable<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.http.post<string[]>(`${API_BASE_URL}/posts/${postId}/photos`, formData);
  }
}
