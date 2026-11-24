import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import {
  FriendRelation,
  FriendRequest,
  FriendRequestResponse,
  UserSearchResult,
} from '../models/friend.model';
import { User } from '../models/user.model';

const FRIENDS_URL = `${API_BASE_URL}/friends`;
const FRIEND_REQUESTS_URL = `${FRIENDS_URL}/requests`;

@Injectable({ providedIn: 'root' })
export class FriendsService {
  private readonly http = inject(HttpClient);

  getFriends(): Observable<User[]> {
    return this.http.get<User[]>(FRIENDS_URL);
  }

  getIncomingRequests(): Observable<FriendRequest[]> {
    return this.http.get<FriendRequest[]>(`${FRIEND_REQUESTS_URL}/incoming`);
  }

  searchUsers(query: string): Observable<UserSearchResult[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<UserSearchResult[]>(`${API_BASE_URL}/users/search`, { params });
  }

  getRelation(userId: number): Observable<FriendRelation> {
    return this.http
      .get<{ relation: FriendRelation }>(`${API_BASE_URL}/users/${userId}/relation`)
      .pipe(map((response) => response.relation));
  }

  sendRequest(userId: number): Observable<FriendRequestResponse> {
    return this.http.post<FriendRequestResponse>(FRIEND_REQUESTS_URL, { userId });
  }

  acceptRequest(requestId: number): Observable<FriendRequestResponse> {
    return this.http.post<FriendRequestResponse>(
      `${FRIEND_REQUESTS_URL}/${requestId}/accept`,
      null,
    );
  }

  declineRequest(requestId: number): Observable<void> {
    return this.http.post<void>(`${FRIEND_REQUESTS_URL}/${requestId}/decline`, null);
  }

  removeFriend(userId: number): Observable<void> {
    return this.http.delete<void>(`${FRIENDS_URL}/${userId}`);
  }
}
