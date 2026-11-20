import { HttpClient } from '@angular/common/http';
import { Injectable, inject, linkedSignal } from '@angular/core';
import { MonoTypeOperatorFunction, Observable, defer, filter, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { EventCategory } from '../models/event.model';
import { ProfileUpdate, User, UserProfile } from '../models/user.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly currentProfile = linkedSignal({
    source: this.auth.session,
    computation: (): UserProfile | null => null,
  });

  readonly profile = this.currentProfile.asReadonly();

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

  private keepProfile(): MonoTypeOperatorFunction<UserProfile> {
    return (source) =>
      defer(() => {
        const session = this.auth.session();
        return source.pipe(
          filter(() => this.auth.session() === session),
          tap((profile) => this.currentProfile.set(profile)),
        );
      });
  }
}
