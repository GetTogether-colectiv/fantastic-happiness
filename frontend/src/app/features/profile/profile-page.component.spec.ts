import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { authInterceptor } from '../../core/interceptors/auth.interceptor';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { UsersService } from '../../core/services/users.service';
import { AUTH_STORAGE_KEY, authResponse, signIn } from '../../core/testing/auth-fixtures';
import { RegisterPageComponent } from '../auth/register-page.component';
import { ProfilePageComponent } from './profile-page.component';

describe('Profile authentication actions', () => {
  const endSession = vi.fn();
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    endSession.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ChatService, useValue: { endSession } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(AUTH_STORAGE_KEY);
  });

  it('logs out from the bottom of Profile, clears the cache and disconnects chat', async () => {
    const { user, token } = signIn();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/profile', ProfilePageComponent);

    const profile = http.expectOne('/api/users/me');
    expect(profile.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    profile.flush({ ...user, preferredCategories: [] });
    http.expectOne('/api/friends').flush([]);
    harness.detectChanges();
    expect(TestBed.inject(UsersService).profile()?.id).toBe(user.id);
    expect(harness.routeNativeElement?.querySelector('app-avatar')?.textContent?.trim()).toBe('A');

    const logout = harness.routeNativeElement!.querySelector<HTMLButtonElement>('footer button')!;
    expect(logout.textContent?.trim()).toBe('Log out');
    logout.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(endSession).toHaveBeenCalledOnce();
    expect(TestBed.inject(AuthService).currentUser()).toBeNull();
    expect(TestBed.inject(UsersService).profile()).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('links to Friends with the friend count', async () => {
    const { user } = signIn();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/profile', ProfilePageComponent);
    http.expectOne('/api/users/me').flush({ ...user, preferredCategories: [] });
    http.expectOne('/api/friends').flush([
      { id: 2, displayName: 'Ana', avatarUrl: null, city: null },
      { id: 3, displayName: 'Bo', avatarUrl: null, city: null },
    ]);
    harness.detectChanges();

    const link = harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.friends-link')!;
    expect(link.textContent?.trim()).toBe('Friends · 2');
    expect(link.getAttribute('href')).toBe('/friends');
  });

  it('opens the existing category picker after registration and saves with the new JWT', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/register', RegisterPageComponent);
    const form = harness.routeNativeElement!.querySelector('form')!;
    for (const [field, value] of Object.entries({
      name: 'New User',
      email: 'new@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    })) {
      const input = form.querySelector<HTMLInputElement>(`[formControlName="${field}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    const response = authResponse(7);
    http.expectOne('/api/auth/register').flush(response, { status: 201, statusText: 'Created' });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/profile#preferences'));

    const profile = http.expectOne('/api/users/me');
    expect(profile.request.headers.get('Authorization')).toBe(`Bearer ${response.token}`);
    profile.flush({ ...response.user, preferredCategories: [] });
    http.expectOne('/api/friends').flush([]);
    harness.detectChanges();
    const tile = harness.routeNativeElement!.querySelector<HTMLButtonElement>(
      '#preferences app-category-picker .tile',
    )!;
    tile.click();

    const updates = await vi.waitFor(() => http.expectOne('/api/users/me/preferences'));
    expect(updates.request.method).toBe('PUT');
    expect(updates.request.headers.get('Authorization')).toBe(`Bearer ${response.token}`);
    expect(updates.request.body.categories).toHaveLength(1);
    updates.flush({ ...response.user, preferredCategories: updates.request.body.categories });
    http.expectNone('/api/auth/login');
  });
});
