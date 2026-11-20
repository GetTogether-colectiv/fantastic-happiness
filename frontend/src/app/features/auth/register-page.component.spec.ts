import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { RegisterPageComponent } from './register-page.component';

@Component({ selector: 'app-profile-stub', template: '' })
class ProfileStub {}

const PASSWORD = ' Password1! ';

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
        provideRouter([{ path: 'profile', component: ProfileStub }]),
        { provide: AuthService, useValue: { register } },
      ],
    });
    fixture = TestBed.createComponent(RegisterPageComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function inputFor(field: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`[formControlName="${field}"]`);
  }

  function fill(field: string, value: string): void {
    const input = inputFor(field);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function fillValidForm(): void {
    fill('name', ' Alex ');
    fill('email', 'alex@example.com');
    fill('password', PASSWORD);
    fill('confirmPassword', PASSWORD);
  }

  function submit(): void {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  function passwordAction(label: string): HTMLButtonElement | undefined {
    const root: HTMLElement = fixture.nativeElement;
    return Array.from(root.querySelectorAll<HTMLButtonElement>('.password-actions button')).find(
      (button) => button.textContent.trim() === label,
    );
  }

  it('shows the password requirements and rejects missing or invalid fields', () => {
    const hint = fixture.nativeElement.querySelector('#password-requirements').textContent;
    for (const requirement of [
      'at least 8 characters',
      'uppercase letter',
      'lowercase letter',
      'a digit',
      'special character',
    ]) {
      expect(hint).toContain(requirement);
    }
    expect(hint).not.toMatch(/byte|bcrypt/i);
    fill('name', ' ');
    fill('email', 'not-an-email');
    fill('password', 'short1');
    submit();

    expect(register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('[aria-invalid="true"]')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('#register-password-error').textContent.trim()).toBe(
      'Use at least 8 characters.',
    );
  });

  it('describes an overlong password without technical details', () => {
    fillValidForm();
    const password = 'é'.repeat(34) + 'Aa1!x';
    fill('password', password);
    fill('confirmPassword', password);
    submit();

    expect(register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#register-password-error').textContent.trim()).toBe(
      'Password is too long',
    );
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
    expect(password.value).toBe(PASSWORD);
    expect(confirmation.value).toBe(password.value);
    expect(register).not.toHaveBeenCalled();
  });

  it('generates and regenerates matching passwords while preserving both visibility settings', () => {
    let entropy = 0;
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((bytes) => {
      if (bytes instanceof Uint8Array) bytes.fill(entropy);
      return bytes;
    });
    fillValidForm();
    fixture.nativeElement.querySelector('button[aria-controls="register-confirmation"]').click();
    expect(passwordAction('Copy password')).toBeUndefined();

    passwordAction('Generate strong password')!.click();
    fixture.detectChanges();
    const first = inputFor('password').value;
    expect(first).toHaveLength(16);
    expect(inputFor('confirmPassword').value).toBe(first);
    expect(inputFor('password').type).toBe('password');
    expect(inputFor('confirmPassword').type).toBe('text');

    entropy = 1;
    passwordAction('Generate another password')!.click();
    fixture.detectChanges();
    const regenerated = inputFor('password').value;
    expect(regenerated).not.toBe(first);
    expect(inputFor('confirmPassword').value).toBe(regenerated);
    expect(register).not.toHaveBeenCalled();

    submit();
    expect(register).toHaveBeenCalledWith({
      name: 'Alex',
      email: 'alex@example.com',
      password: regenerated,
    });
  });

  it('copies the generated password only on request and resets copy after a manual edit', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    passwordAction('Generate strong password')!.click();
    fixture.detectChanges();
    expect(writeText).not.toHaveBeenCalled();

    passwordAction('Copy password')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(writeText).toHaveBeenCalledExactlyOnceWith(inputFor('password').value);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent.trim()).toBe(
      'Password copied.',
    );
    expect(register).not.toHaveBeenCalled();

    fill('password', PASSWORD);
    fixture.detectChanges();
    expect(passwordAction('Copy password')).toBeUndefined();
    expect(passwordAction('Generate strong password')).toBeDefined();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent.trim()).toBe('');
  });

  it('offers manual copy guidance if the clipboard write fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard unavailable'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    passwordAction('Generate strong password')!.click();
    fixture.detectChanges();
    passwordAction('Copy password')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Show the password to copy it manually.',
    );
    expect(inputFor('password').type).toBe('password');
    expect(passwordAction('Copy password')?.disabled).toBe(false);
  });

  it('shows a duplicate email error and enables another attempt', () => {
    fillValidForm();
    submit();
    result.error(new HttpErrorResponse({ status: 409, statusText: 'Conflict' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Email already registered.');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it('submits once without the confirmation and opens Profile preferences on success', async () => {
    fillValidForm();
    submit();
    submit();

    expect(register).toHaveBeenCalledOnce();
    expect(register).toHaveBeenCalledWith({
      name: 'Alex',
      email: 'alex@example.com',
      password: PASSWORD,
    });
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);

    result.next();
    result.complete();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/profile#preferences');
  });
});
