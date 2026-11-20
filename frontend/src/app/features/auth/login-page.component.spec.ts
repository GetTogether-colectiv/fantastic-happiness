import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LoginPageComponent } from './login-page.component';

@Component({ selector: 'app-discover-stub', template: '' })
class DiscoverStub {}

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let result: Subject<void>;
  const login = vi.fn();

  beforeEach(() => {
    result = new Subject<void>();
    login.mockReset().mockReturnValue(result);
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([
          { path: '', redirectTo: 'discover', pathMatch: 'full' },
          { path: 'discover', component: DiscoverStub },
          { path: 'login', component: LoginPageComponent },
          { path: 'my-events', component: DiscoverStub },
        ]),
        { provide: AuthService, useValue: { login } },
      ],
    });
    fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
  });

  function fill(field: string, value: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      `[formControlName="${field}"]`,
    );
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function submit(): void {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  it('shows validation errors without calling the API for blank fields', () => {
    submit();

    expect(login).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
    expect(fixture.nativeElement.textContent).toContain('Enter your password.');
  });

  it('shows the required error text for invalid credentials', () => {
    fill('email', 'alex@example.com');
    fill('password', 'incorrect');
    submit();
    result.error(new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Email or password is incorrect');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it('shows and hides the password without submitting or changing its value', () => {
    fill('email', 'alex@example.com');
    fill('password', ' password1 ');

    const root: HTMLElement = fixture.nativeElement;
    const password = root.querySelector<HTMLInputElement>('#login-password')!;
    const toggle = root.querySelector<HTMLButtonElement>('button[aria-controls="login-password"]')!;
    expect(password.type).toBe('password');
    expect(toggle.type).toBe('button');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');

    toggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');

    toggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    expect(password.value).toBe(' password1 ');
    expect(login).not.toHaveBeenCalled();
  });

  it('submits once, preserves the password and navigates to Discover on success', async () => {
    fill('email', 'alex@example.com');
    fill('password', ' password1 ');
    submit();
    submit();

    expect(login).toHaveBeenCalledOnce();
    expect(login).toHaveBeenCalledWith({ email: 'alex@example.com', password: ' password1 ' });
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);

    result.next();
    result.complete();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/discover');
  });

  it.each([
    ['/my-events?view=list#upcoming', '/my-events?view=list#upcoming'],
    ['//example.test/landing', '/discover'],
    ['/register', '/discover'],
  ])('uses a safe return destination for %s', async (returnUrl, expected) => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(router.createUrlTree(['/login'], { queryParams: { returnUrl } }));
    fill('email', 'alex@example.com');
    fill('password', 'password1');
    submit();

    result.next();
    result.complete();
    await fixture.whenStable();

    expect(router.url).toBe(expected);
  });
});
