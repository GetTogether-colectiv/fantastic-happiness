import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'currentUserId';
const DEFAULT_USER_ID = 1;

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly auth = inject(AuthService);
  private readonly selectedUserId = signal(this.readStoredUserId());

  readonly userId = computed(() => this.auth.currentUser()?.id ?? this.selectedUserId());

  select(userId: number): void {
    if (this.auth.currentUser()) return;

    localStorage.setItem(STORAGE_KEY, String(userId));
    this.selectedUserId.set(userId);
  }

  private readStoredUserId(): number {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(stored) && stored > 0 ? stored : DEFAULT_USER_ID;
  }
}
