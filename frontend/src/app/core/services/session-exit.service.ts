import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { isAuthPage, loginUrl } from '../auth/auth-navigation';
import { AuthResponse } from '../models/auth.model';
import { AuthService } from './auth.service';
import { ChatService } from './chat.service';

@Injectable({ providedIn: 'root' })
export class SessionExitService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly chat = inject(ChatService);
  private redirecting = false;

  logout(): void {
    this.endSession();
  }

  unauthorized(requestSession: AuthResponse | null): void {
    const currentSession = this.auth.session();
    if (currentSession && currentSession !== requestSession) return;

    const page = this.router.currentNavigation()?.finalUrl ?? this.router.parseUrl(this.router.url);
    if (isAuthPage(page)) {
      if (currentSession) this.clearSession();
      return;
    }
    this.endSession(this.router.serializeUrl(page));
  }

  private endSession(returnUrl?: string): void {
    this.clearSession();
    if (this.redirecting) return;

    this.redirecting = true;
    const finish = () => {
      this.redirecting = false;
    };
    void this.router
      .navigateByUrl(loginUrl(this.router, returnUrl), { replaceUrl: true })
      .then(finish, finish);
  }

  private clearSession(): void {
    this.auth.clearSession();
    this.chat.endSession();
  }
}
