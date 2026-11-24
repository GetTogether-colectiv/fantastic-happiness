import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { UsersService } from './core/services/users.service';
import { AUTH_STORAGE_KEY, authResponse, signIn } from './core/testing/auth-fixtures';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.removeItem(AUTH_STORAGE_KEY);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it.each([
    ['/login', 'app-login-page'],
    ['/register', 'app-register-page'],
  ])('loads %s without the navigation', async (url, selector) => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector(selector)).not.toBeNull();
    expect(root.querySelector('app-main-nav')).toBeNull();
    expect(root.querySelector('.profile-shortcut')).toBeNull();
    expect(root.querySelector('.content')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone('/api/users/me');
  });

  it('keeps the existing navigation and page layout on app routes', async () => {
    const { user } = signIn();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/profile');
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http.expectNone('/api/users');
    http.expectOne('/api/users/me').flush({ ...user, preferredCategories: [] });
    http.expectOne('/api/friends').flush([]);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('app-main-nav')).not.toBeNull();
    expect(root.querySelector('.top-bar a.logo')?.getAttribute('href')).toBe('/discover');
    expect(root.querySelector('.content app-profile-page')).not.toBeNull();
    expect(root.querySelector('.profile-shortcut app-avatar')?.textContent?.trim()).toBe('A');

    const changes = { displayName: 'Alex Deleanu', city: null, avatarUrl: '/updated.jpg' };
    TestBed.inject(UsersService).updateProfile(changes).subscribe();
    http.expectOne('/api/users/me').flush({ ...user, ...changes, preferredCategories: [] });
    fixture.detectChanges();
    expect(root.querySelector('.profile-shortcut img')?.getAttribute('src')).toBe('/updated.jpg');
  });

  it('refreshes the header photo after restoring a session and links to Profile', async () => {
    const session = authResponse();
    session.user.avatarUrl = '/previous.jpg';
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/events/new');
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const profileLink = root.querySelector<HTMLAnchorElement>('.profile-shortcut')!;
    expect(profileLink.getAttribute('aria-label')).toBe('Go to your profile');
    const http = TestBed.inject(HttpTestingController);
    const profile = { ...session.user, avatarUrl: '/latest.jpg', preferredCategories: [] };
    const request = http.expectOne('/api/users/me');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${session.token}`);
    request.flush(profile);
    fixture.detectChanges();
    expect(profileLink.querySelector('img')?.getAttribute('src')).toBe('/latest.jpg');
    expect(root.querySelector('app-profile-page')).toBeNull();

    profileLink.click();
    await fixture.whenStable();
    expect(router.url).toBe('/profile');
    http.expectOne('/api/users/me').flush(profile);
    http.expectOne('/api/friends').flush([]);
  });
});
