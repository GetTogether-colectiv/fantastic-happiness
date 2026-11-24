import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { LoginPageComponent } from '../../features/auth/login-page.component';
import { RegisterPageComponent } from '../../features/auth/register-page.component';
import { AuthService } from '../services/auth.service';
import { AUTH_STORAGE_KEY, authResponse, signIn } from '../testing/auth-fixtures';

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => localStorage.removeItem(AUTH_STORAGE_KEY));

  it.each([
    '/events/new',
    '/events/7/edit',
    '/events/7/chat?view=latest#messages',
    '/events/7',
    '/discover',
    '/swipe',
    '/map',
    '/my-events',
    '/profile#preferences',
    '/friends',
    '/users/7',
  ])('sends an unauthenticated visit to %s to login', async (url) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, LoginPageComponent);
    expect(
      TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).queryParams['returnUrl'],
    ).toBe(url);
  });

  it('rejects an expired stored session and leaves registration public', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authResponse(1, 0)));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/profile', LoginPageComponent);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    await harness.navigateByUrl('/register', RegisterPageComponent);
  });

  it('checks authentication again when only the protected route query changes', async () => {
    const { user } = signIn();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/profile');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/users/me').flush({ ...user, preferredCategories: [] });
    http.expectOne('/api/friends').flush([]);
    TestBed.inject(AuthService).clearSession();

    await harness.navigateByUrl('/profile?view=preferences', LoginPageComponent);

    const router = TestBed.inject(Router);
    expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe('/profile?view=preferences');
    http.verify();
  });
});
