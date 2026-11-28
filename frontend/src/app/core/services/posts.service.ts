import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import {
  CreateCommentRequest,
  CreatePostRequest,
  EventPost,
  EventPostsResponse,
  PostComment,
} from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);

  getPosts(eventId: number): Observable<EventPostsResponse> {
    return this.http.get<EventPostsResponse>(`${API_BASE_URL}/events/${eventId}/posts`);
  }

  createPost(eventId: number, request: CreatePostRequest): Observable<EventPost> {
    return this.http.post<EventPost>(`${API_BASE_URL}/events/${eventId}/posts`, request);
  }

  getComments(postId: number): Observable<PostComment[]> {
    return this.http.get<PostComment[]>(`${API_BASE_URL}/posts/${postId}/comments`);
  }

  createComment(postId: number, request: CreateCommentRequest): Observable<PostComment> {
    return this.http.post<PostComment>(`${API_BASE_URL}/posts/${postId}/comments`, request);
  }

  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/comments/${commentId}`);
  }
}
