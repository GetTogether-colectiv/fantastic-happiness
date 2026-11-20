import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ChatService } from '../services/chat.service';
import { AUTH_STORAGE_KEY, signIn } from '../testing/auth-fixtures';
import { authInterceptor } from './auth.interceptor';

@Component({ selector: 'app-page-stub', template: '' })
class PageStub {}

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let router: Router;
  const endSession = vi.fn();
  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  beforeEach(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    endSession.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'events/:id', component: PageStub },
          { path: 'login', component: PageStub },
          { path: 'register', component: PageStub },
        ]),
        { provide: ChatService, useValue: { endSession } },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(AUTH_STORAGE_KEY);
  });

  it('attaches the current JWT to the backend API and strips caller-supplied identity', () => {
    const { token } = signIn();
    client
      .get('/api/users/me', {
        headers: new HttpHeaders({ Authorization: 'Bearer another-token', 'X-User-Id': '99' }),
      })
      .subscribe();
    const protectedRequest = http.expectOne('/api/users/me');
    expect(protectedRequest.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(protectedRequest.request.headers.has('X-User-Id')).toBe(false);
    protectedRequest.flush({});

    for (const url of ['/apix/users', 'https://example.test/api/users', '/LOGO.svg']) {
      client.get(url).subscribe();
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    }
  });

  it('leaves the login 401 for the form and ignores non-API 401s', async () => {
    signIn();
    await router.navigateByUrl('/login?returnUrl=%2Fevents%2F42');
    const error = vi.fn();
    for (const url of ['/api/auth/login', 'https://example.test/api/users']) {
      client.post(url, {}).subscribe({ error });
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({ message: 'Email or password is incorrect' }, unauthorized);
    }
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        error: { message: 'Email or password is incorrect' },
      }),
    );
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(true);
    expect(endSession).not.toHaveBeenCalled();
    expect(router.url).toBe('/login?returnUrl=%2Fevents%2F42');
  });

  it('clears the session and redirects once for concurrent 401s, preserving the current URL', async () => {
    signIn();
    await router.navigateByUrl('/events/42?view=list#latest');
    const navigate = vi.spyOn(router, 'navigateByUrl');
    const error = vi.fn();
    client.get('/api/events').subscribe({ error });
    client.get('/api/users').subscribe({ error });

    http.expectOne('/api/events').flush({}, unauthorized);
    http.expectOne('/api/users').flush({}, unauthorized);
    await vi.waitFor(() => expect(router.url).toMatch(/^\/login\?/));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe(
      '/events/42?view=list#latest',
    );
    expect(TestBed.inject(AuthService).currentUser()).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(endSession).toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(2);
  });

  it('ignores a late 401 from before the current login even when both JWTs are identical', async () => {
    const response = signIn();
    await router.navigateByUrl('/events/42');
    client.get('/api/events').subscribe({ error: vi.fn() });
    const pending = http.expectOne('/api/events');
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'alex@example.com', password: 'password1' }).subscribe();
    http.expectOne('/api/auth/login').flush(response);

    pending.flush({}, unauthorized);
    expect(auth.currentUser()?.id).toBe(response.user.id);
    expect(router.url).toBe('/events/42');
    expect(endSession).not.toHaveBeenCalled();
  });
});
