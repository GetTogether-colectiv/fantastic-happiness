import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthResponse } from '../models/auth.model';
import { User } from '../models/user.model';
import { AuthService } from './auth.service';

const SESSION_KEY = 'gettogether.auth';
const NOW = new Date('2026-11-20T12:00:00Z');
const SESSION_SECONDS = 60;
const USER: User = { id: 7, displayName: 'Alex', avatarUrl: null, city: null };

function authResponse(expiresAt = NOW.getTime() / 1_000 + SESSION_SECONDS): AuthResponse {
  const header = btoa(JSON.stringify({ alg: 'HS256' })).replace(/=+$/, '');
  const payload = btoa(JSON.stringify({ sub: String(USER.id), exp: expiresAt })).replace(/=+$/, '');
  return { token: `${header}.${payload}.c2lnbmF0dXJl`, user: USER };
}

describe('AuthService', () => {
  let http: HttpTestingController;

  function configureTestBed(): void {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    localStorage.removeItem(SESSION_KEY);
    configureTestBed();
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(SESSION_KEY);
    vi.useRealTimers();
  });

  it('posts login credentials, persists the response and restores it in a new app instance', () => {
    const service = TestBed.inject(AuthService);
    const credentials = { email: 'alex@example.com', password: ' password1 ' };
    const response = authResponse();
    service.login(credentials).subscribe();

    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);
    request.flush(response);

    expect(service.currentUser()).toEqual(USER);
    expect(service.isLoggedIn()).toBe(true);
    expect(localStorage.getItem(SESSION_KEY)).toBe(JSON.stringify(response));

    TestBed.resetTestingModule();
    configureTestBed();
    const restored = TestBed.inject(AuthService);
    expect(restored.currentUser()).toEqual(USER);
    expect(restored.isLoggedIn()).toBe(true);
    http.expectNone('/api/users/me');
  });

  it('authenticates directly from the registration response', () => {
    const service = TestBed.inject(AuthService);
    const registration = { name: 'Alex', email: 'alex@example.com', password: 'password1' };
    service.register(registration).subscribe();

    const request = http.expectOne('/api/auth/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(registration);
    request.flush(authResponse(), { status: 201, statusText: 'Created' });

    expect(service.currentUser()).toEqual(USER);
    expect(service.isLoggedIn()).toBe(true);
    http.expectNone('/api/auth/login');
  });

  it('checks the clock on each login check and clears the session when the timer expires', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(authResponse()));
    const service = TestBed.inject(AuthService);
    expect(service.isLoggedIn()).toBe(true);

    vi.setSystemTime(new Date(NOW.getTime() + SESSION_SECONDS * 1_000));
    expect(service.isLoggedIn()).toBe(false);
    vi.setSystemTime(NOW);
    vi.advanceTimersByTime(SESSION_SECONDS * 1_000);

    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('leaves a newer saved session in place when an older tab expires', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(authResponse()));
    const service = TestBed.inject(AuthService);
    const newer = JSON.stringify(authResponse(NOW.getTime() / 1_000 + SESSION_SECONDS * 2));
    localStorage.setItem(SESSION_KEY, newer);

    vi.advanceTimersByTime(SESSION_SECONDS * 1_000);

    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBe(newer);
  });

  it.each([
    ['unreadable JSON', '{not-json'],
    ['a malformed token', JSON.stringify({ ...authResponse(), token: 'not-a-jwt' })],
    ['an expired token', JSON.stringify(authResponse(NOW.getTime() / 1_000 - 1))],
    ['a mismatched user ID', JSON.stringify({ ...authResponse(), user: { ...USER, id: 8 } })],
  ])('clears %s from storage on startup', (_, stored) => {
    localStorage.setItem(SESSION_KEY, stored);

    const service = TestBed.inject(AuthService);

    expect(service.currentUser()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
