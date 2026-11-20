import { DOCUMENT, inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import {
  API_BASE_URL,
  AUTH_API_URL,
  AUTHORIZATION_HEADER,
  USER_ID_HEADER,
  bearerToken,
} from '../api.config';
import { LOGIN_PATH, REGISTER_PATH } from '../auth/auth-navigation';
import { AuthService } from '../services/auth.service';
import { SessionExitService } from '../services/session-exit.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const document = inject(DOCUMENT);
  let url: URL;
  try {
    url = new URL(request.url, document.baseURI);
  } catch {
    return next(request);
  }

  if (
    url.origin !== document.location?.origin ||
    (url.pathname !== API_BASE_URL && !url.pathname.startsWith(`${API_BASE_URL}/`)) ||
    [LOGIN_PATH, REGISTER_PATH].some(
      (path) => url.pathname.replace(/\/+$/, '') === `${AUTH_API_URL}/${path}`,
    )
  ) {
    return next(request);
  }

  const auth = inject(AuthService);
  const sessionExit = inject(SessionExitService);
  const session = auth.session();
  let headers = request.headers.delete(USER_ID_HEADER).delete(AUTHORIZATION_HEADER);
  if (session && auth.isLoggedIn()) {
    headers = headers.set(AUTHORIZATION_HEADER, bearerToken(session.token));
  }

  return next(request.clone({ headers })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        sessionExit.unauthorized(session);
      }
      return throwError(() => error);
    }),
  );
};
