export const API_BASE_URL = '/api';
export const AUTH_API_URL = `${API_BASE_URL}/auth`;

export const AUTHORIZATION_HEADER = 'Authorization';

export function bearerToken(token: string): string {
  return `Bearer ${token}`;
}
