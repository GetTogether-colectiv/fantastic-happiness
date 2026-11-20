import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthResponse } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

export const AUTH_STORAGE_KEY = 'gettogether.auth';

export function authResponse(
  userId = 1,
  expiresAt = Math.floor(Date.now() / 1_000) + 60,
): AuthResponse {
  const header = encode({ alg: 'HS256' });
  const payload = encode({ sub: String(userId), exp: expiresAt });
  return {
    token: `${header}.${payload}.c2lnbmF0dXJl`,
    user: { id: userId, displayName: 'Alex', avatarUrl: null, city: null },
  };
}

export function signIn(userId = 1): AuthResponse {
  const response = authResponse(userId);
  TestBed.inject(AuthService)
    .login({ email: 'alex@example.com', password: 'password1' })
    .subscribe();
  TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush(response);
  return response;
}

function encode(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
