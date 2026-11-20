import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it.each([
    ['/login', 'app-login-page'],
    ['/register', 'app-register-page'],
  ])('loads %s without the navigation or user switcher', async (url, selector) => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector(selector)).not.toBeNull();
    expect(root.querySelector('app-main-nav')).toBeNull();
    expect(root.querySelector('app-user-switcher')).toBeNull();
    expect(root.querySelector('.content')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone('/api/users');
  });

  it('keeps the existing navigation and page layout on app routes', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/profile');
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    const profile = { id: 1, displayName: 'Alex', city: null, avatarUrl: null };
    http.expectOne('/api/users').flush([profile]);
    http.expectOne('/api/users/me').flush({ ...profile, preferredCategories: [] });
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('app-main-nav')).not.toBeNull();
    expect(root.querySelector('app-user-switcher')).not.toBeNull();
    expect(root.querySelector('.content app-profile-page')).not.toBeNull();
  });
});
