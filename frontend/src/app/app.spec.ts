import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { AUTH_STORAGE_KEY, signIn } from './core/testing/auth-fixtures';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
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
    expect(root.querySelector('.content')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone('/api/users');
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
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('app-main-nav')).not.toBeNull();
    expect(root.querySelector('.top-bar a.logo')?.getAttribute('href')).toBe('/discover');
    expect(root.querySelector('.content app-profile-page')).not.toBeNull();
  });
});
