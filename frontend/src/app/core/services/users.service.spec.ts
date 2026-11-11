import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { User, UserProfile } from '../models/user.model';
import { UsersService } from './users.service';

const PROFILE: UserProfile = {
  id: 1,
  displayName: 'Alex',
  avatarUrl: null,
  city: 'Cluj-Napoca',
  preferredCategories: ['MUSIC'],
};

describe('UsersService', () => {
  let service: UsersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists all users', () => {
    const users: User[] = [{ id: 1, displayName: 'Alex', avatarUrl: null, city: null }];
    const received = vi.fn();
    service.findAll().subscribe(received);
    const request = http.expectOne('/api/users');
    expect(request.request.method).toBe('GET');
    request.flush(users);
    expect(received).toHaveBeenCalledWith(users);
  });

  it('loads one user by id', () => {
    const user: User = { id: 7, displayName: 'Alex', avatarUrl: null, city: null };
    const received = vi.fn();
    service.getUser(7).subscribe(received);
    const request = http.expectOne('/api/users/7');
    expect(request.request.method).toBe('GET');
    request.flush(user);
    expect(received).toHaveBeenCalledWith(user);
  });

  describe('profile', () => {
    it('starts without a profile', () => {
      expect(service.profile()).toBeNull();
    });

    it('loads the current profile and keeps it in the signal', () => {
      const received = vi.fn();
      service.loadProfile().subscribe(received);
      const request = http.expectOne('/api/users/me');
      expect(request.request.method).toBe('GET');
      request.flush(PROFILE);
      expect(received).toHaveBeenCalledWith(PROFILE);
      expect(service.profile()).toEqual(PROFILE);
    });

    it('sends the profile update and replaces the signal with the response', () => {
      const update = { displayName: 'Alex D', city: null, avatarUrl: null };
      service.updateProfile(update).subscribe();
      const request = http.expectOne('/api/users/me');
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual(update);
      request.flush({ ...PROFILE, ...update });
      expect(service.profile()?.displayName).toBe('Alex D');
      expect(service.profile()?.city).toBeNull();
    });

    it('sends the categories in a "categories" field and keeps the returned profile', () => {
      service.updatePreferences(['MUSIC', 'TECH']).subscribe();
      const request = http.expectOne('/api/users/me/preferences');
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ categories: ['MUSIC', 'TECH'] });
      request.flush({ ...PROFILE, preferredCategories: ['MUSIC', 'TECH'] });
      expect(service.profile()?.preferredCategories).toEqual(['MUSIC', 'TECH']);
    });

    it('keeps the previous profile when a request fails', () => {
      service.loadProfile().subscribe();
      http.expectOne('/api/users/me').flush(PROFILE);

      const error = vi.fn();
      service.updatePreferences(['TECH']).subscribe({ error });
      http
        .expectOne('/api/users/me/preferences')
        .flush(null, { status: 500, statusText: 'Server Error' });

      expect(error).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
      expect(service.profile()).toEqual(PROFILE);
    });
  });
});
