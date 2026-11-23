import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AUTH_API_URL } from '../api.config';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';
import { User } from '../models/user.model';

const SESSION_KEY = 'gettogether.auth';
const MS_PER_SECOND = 1_000;
const MAX_TIMEOUT_MS = 2_147_483_647;
const BASE64_URL_SEGMENT = /^[A-Za-z0-9_-]+$/;

interface Session extends AuthResponse {
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storedSession = signal<Session | null>(null);
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  readonly session = this.storedSession.asReadonly();
  readonly currentUser = computed(() => this.session()?.user ?? null);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expiryTimer));

    const restored = this.readStoredSession();
    if (restored) {
      this.storedSession.set(restored);
      this.scheduleExpiry();
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.authenticate('login', request);
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.authenticate('register', request);
  }

  isLoggedIn(): boolean {
    const session = this.session();
    return session !== null && session.expiresAt > Date.now();
  }

  clearSession(): void {
    const session = this.session();
    clearTimeout(this.expiryTimer);
    this.storedSession.set(null);
    if (session) this.removeStoredSession(session.token);
  }

  private authenticate(
    action: 'login' | 'register',
    request: LoginRequest | RegisterRequest,
  ): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${AUTH_API_URL}/${action}`, request).pipe(
      tap((response) => {
        const session = readSession(response);
        if (!session) {
          throw new Error('Invalid authentication response');
        }

        this.storedSession.set(session);
        try {
          const { token, user } = session;
          localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
        } catch {
          // The current tab can still use the session if browser storage is unavailable.
        }
        this.scheduleExpiry();
      }),
    );
  }

  private readStoredSession(): Session | null {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored === null) return null;

      const session = readSession(JSON.parse(stored));
      if (session) return session;
    } catch {
      // An unreadable entry can be discarded along with invalid sessions.
    }

    this.removeStoredSession();
    return null;
  }

  private scheduleExpiry(): void {
    clearTimeout(this.expiryTimer);
    const session = this.session();
    if (!session) return;

    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) {
      this.clearSession();
      return;
    }

    this.expiryTimer = setTimeout(() => this.scheduleExpiry(), Math.min(remaining, MAX_TIMEOUT_MS));
  }

  private removeStoredSession(token?: string): void {
    try {
      if (token !== undefined) {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored === null || JSON.parse(stored)?.token !== token) return;
      }
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // The in-memory session has already been cleared.
    }
  }
}

function readSession(value: unknown): Session | null {
  const response = value as Partial<AuthResponse> | null;
  if (typeof response?.token !== 'string' || !isUser(response.user)) return null;

  const { token, user } = response;
  const parts = token.split('.');
  if (
    parts.length !== 3 ||
    parts.some((part) => !BASE64_URL_SEGMENT.test(part) || part.length % 4 === 1)
  ) {
    return null;
  }

  try {
    const [header, payload] = parts;
    const { alg } = decodeSegment(header) as { alg?: unknown };
    const { exp, sub } = decodeSegment(payload) as { exp?: unknown; sub?: unknown };
    if (typeof alg !== 'string' || !alg || alg === 'none' || typeof exp !== 'number') return null;

    const expiresAt = exp * MS_PER_SECOND;
    return sub === String(user.id) && Number.isFinite(expiresAt) && expiresAt > Date.now()
      ? { token, user, expiresAt }
      : null;
  } catch {
    return null;
  }
}

function decodeSegment(segment: string): unknown {
  return JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')));
}

function isUser(user: User | undefined): user is User {
  return (
    !!user &&
    Number.isSafeInteger(user.id) &&
    user.id > 0 &&
    typeof user.displayName === 'string' &&
    (user.avatarUrl === null || typeof user.avatarUrl === 'string') &&
    (user.city === null || typeof user.city === 'string')
  );
}
