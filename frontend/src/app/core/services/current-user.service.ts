import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'currentUserId';
const DEFAULT_USER_ID = 1;

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly selectedUserId = signal(this.readStoredUserId());

  readonly userId = this.selectedUserId.asReadonly();

  select(userId: number): void {
    localStorage.setItem(STORAGE_KEY, String(userId));
    this.selectedUserId.set(userId);
  }

  private readStoredUserId(): number {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(stored) && stored > 0 ? stored : DEFAULT_USER_ID;
  }
}
