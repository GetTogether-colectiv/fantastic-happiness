import { TestBed } from '@angular/core/testing';
import { CurrentUserService } from './current-user.service';

describe('CurrentUserService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('defaults to the first seeded user', () => {
    expect(TestBed.inject(CurrentUserService).userId()).toBe(1);
  });

  it('remembers the selected user across reloads', () => {
    TestBed.inject(CurrentUserService).select(5);

    TestBed.resetTestingModule();

    expect(TestBed.inject(CurrentUserService).userId()).toBe(5);
  });
});
