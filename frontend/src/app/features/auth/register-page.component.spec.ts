import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { RegisterPageComponent } from './register-page.component';

@Component({ selector: 'app-discover-stub', template: '' })
class DiscoverStub {}

describe('RegisterPageComponent', () => {
  let fixture: ComponentFixture<RegisterPageComponent>;
  let result: Subject<void>;
  const register = vi.fn();

  beforeEach(() => {
    result = new Subject<void>();
    register.mockReset().mockReturnValue(result);
    TestBed.configureTestingModule({
      imports: [RegisterPageComponent],
      providers: [
        provideRouter([
          { path: '', redirectTo: 'discover', pathMatch: 'full' },
          { path: 'discover', component: DiscoverStub },
        ]),
        { provide: AuthService, useValue: { register } },
      ],
    });
    fixture = TestBed.createComponent(RegisterPageComponent);
    fixture.detectChanges();
  });

  function fill(field: string, value: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      `[formControlName="${field}"]`,
    );
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function fillValidForm(): void {
    fill('name', ' Alex ');
    fill('email', 'alex@example.com');
    fill('password', ' password1 ');
    fill('confirmPassword', ' password1 ');
  }

  function submit(): void {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  it('shows the password requirements and rejects missing or invalid fields', () => {
    expect(fixture.nativeElement.querySelector('#password-requirements').textContent).toContain(
      'at least 8 characters',
    );
    fill('name', ' ');
    fill('email', 'not-an-email');
    fill('password', 'short1');
    submit();

    expect(register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('[aria-invalid="true"]')).toHaveLength(4);
  });

  it('rejects mismatched passwords', () => {
    fillValidForm();
    fill('confirmPassword', 'password2');
    submit();

    expect(register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Passwords must match.');
  });

  it('toggles each password field independently without submitting', () => {
    fillValidForm();

    const root: HTMLElement = fixture.nativeElement;
    const password = root.querySelector<HTMLInputElement>('#register-password')!;
    const confirmation = root.querySelector<HTMLInputElement>('#register-confirmation')!;
    const passwordToggle = root.querySelector<HTMLButtonElement>(
      'button[aria-controls="register-password"]',
    )!;
    const confirmationToggle = root.querySelector<HTMLButtonElement>(
      'button[aria-controls="register-confirmation"]',
    )!;

    expect(password.type).toBe('password');
    expect(confirmation.type).toBe('password');
    expect(passwordToggle.type).toBe('button');
    expect(confirmationToggle.type).toBe('button');
    expect(passwordToggle.getAttribute('aria-label')).toBe('Show password');
    expect(confirmationToggle.getAttribute('aria-label')).toBe('Show password confirmation');

    passwordToggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(confirmation.type).toBe('password');
    expect(passwordToggle.getAttribute('aria-label')).toBe('Hide password');

    confirmationToggle.click();
    passwordToggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('password');
    expect(confirmation.type).toBe('text');
    expect(confirmationToggle.getAttribute('aria-label')).toBe('Hide password confirmation');

    confirmationToggle.click();
    fixture.detectChanges();
    expect(confirmation.type).toBe('password');
    expect(confirmationToggle.getAttribute('aria-label')).toBe('Show password confirmation');
    expect(password.value).toBe(' password1 ');
    expect(confirmation.value).toBe(password.value);
    expect(register).not.toHaveBeenCalled();
  });

  it('shows a duplicate email error and enables another attempt', () => {
    fillValidForm();
    submit();
    result.error(new HttpErrorResponse({ status: 409, statusText: 'Conflict' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Email already registered.');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it('submits once without the confirmation and navigates to Discover on success', async () => {
    fillValidForm();
    submit();
    submit();

    expect(register).toHaveBeenCalledOnce();
    expect(register).toHaveBeenCalledWith({
      name: 'Alex',
      email: 'alex@example.com',
      password: ' password1 ',
    });
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);

    result.next();
    result.complete();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/discover');
  });
});
