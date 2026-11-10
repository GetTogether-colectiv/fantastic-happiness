import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { EventCategory } from '../models/event.model';
import { ProfileUpdate, User, UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly currentProfile = signal<UserProfile | null>(null);

  readonly profile = this.currentProfile.asReadonly();

  findAll(): Observable<User[]> {
    return this.http.get<User[]>(`${API_BASE_URL}/users`);
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${API_BASE_URL}/users/${id}`);
  }

  loadProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${API_BASE_URL}/users/me`).pipe(this.keepProfile());
  }

  updateProfile(update: ProfileUpdate): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${API_BASE_URL}/users/me`, update).pipe(this.keepProfile());
  }

  updatePreferences(categories: EventCategory[]): Observable<UserProfile> {
    return this.http
      .put<UserProfile>(`${API_BASE_URL}/users/me/preferences`, { categories })
      .pipe(this.keepProfile());
  }

  private keepProfile() {
    return tap((profile: UserProfile) => this.currentProfile.set(profile));
  }
}
