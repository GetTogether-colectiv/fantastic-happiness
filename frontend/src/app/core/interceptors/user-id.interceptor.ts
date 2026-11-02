import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../api.config';
import { CurrentUserService } from '../services/current-user.service';

const USER_ID_HEADER = 'X-User-Id';

export const userIdInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_BASE_URL)) {
    return next(request);
  }
  const userId = inject(CurrentUserService).userId();
  return next(request.clone({ setHeaders: { [USER_ID_HEADER]: String(userId) } }));
};
