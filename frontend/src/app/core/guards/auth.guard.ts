import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { loginUrl } from '../auth/auth-navigation';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateChildFn = (_, state) =>
  inject(AuthService).isLoggedIn() || loginUrl(inject(Router), state.url);
