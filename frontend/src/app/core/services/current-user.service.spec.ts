import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { User } from '../models/user.model';
import { AuthService } from './auth.service';
import { CurrentUserService } from './current-user.service';

describe('CurrentUserService', () => {
  const authenticatedUser = signal<User | null>(null);

  function configureTestBed(): void {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { currentUser: authenticatedUser } }],
    });
  }

  beforeEach(() => {
    localStorage.clear();
    authenticatedUser.set(null);
    TestBed.resetTestingModule();
    configureTestBed();
  });

  it('defaults to the first seeded user', () => {
    expect(TestBed.inject(CurrentUserService).userId()).toBe(1);
  });

  it('remembers the selected user across reloads', () => {
    TestBed.inject(CurrentUserService).select(5);

    TestBed.resetTestingModule();
    configureTestBed();

    expect(TestBed.inject(CurrentUserService).userId()).toBe(5);
  });

  it('uses the authenticated ID and prevents selection from replacing it', () => {
    const currentUser = TestBed.inject(CurrentUserService);
    currentUser.select(5);
    authenticatedUser.set({ id: 7, displayName: 'Alex', avatarUrl: null, city: null });

    currentUser.select(9);

    expect(currentUser.userId()).toBe(7);
    authenticatedUser.set(null);
    expect(currentUser.userId()).toBe(5);
  });
});
