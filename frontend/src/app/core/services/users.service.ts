import { HttpClient } from '@angular/common/http';
import { Injectable, inject, linkedSignal } from '@angular/core';
import { MonoTypeOperatorFunction, Observable, defer, filter, finalize, shareReplay, tap } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { AuthResponse } from '../models/auth.model';
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
  private profileRequest?: { session: AuthResponse | null; response$: Observable<UserProfile> };

  readonly profile = this.currentProfile.asReadonly();

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${API_BASE_URL}/users/${id}`);
  }

  loadProfile(): Observable<UserProfile> {
    return defer(() => {
      const session = this.auth.session();
      if (this.profileRequest?.session === session) return this.profileRequest.response$;

      const response$ = this.http.get<UserProfile>(`${API_BASE_URL}/users/me`).pipe(
        this.keepProfile(),
        finalize(() => {
          if (this.profileRequest?.response$ === response$) this.profileRequest = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      this.profileRequest = { session, response$ };
      return response$;
    });
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
