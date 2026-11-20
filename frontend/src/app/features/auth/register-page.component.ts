import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PROFILE_PREFERENCES_FRAGMENT } from '../../core/auth/auth-navigation';
import { AuthService } from '../../core/services/auth.service';
import {
  NAME_MAX_LENGTH,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  emailValidators,
  notBlankValidator,
  passwordMatchValidator,
  passwordRequirementsValidator,
} from './auth.validators';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, MatIcon],
  templateUrl: './register-page.component.html',
  styleUrl: './auth-page.scss',
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;
  protected readonly passwordMaxBytes = PASSWORD_MAX_BYTES;
  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      name: ['', [notBlankValidator, Validators.maxLength(NAME_MAX_LENGTH)]],
      email: ['', emailValidators],
      password: ['', [Validators.required, passwordRequirementsValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator() },
  );
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);
  protected readonly confirmationVisible = signal(false);

  protected submit(): void {
    if (this.submitting()) return;

    this.submitError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .register({ name: name.trim(), email: email.trim(), password })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () =>
          void this.router.navigate(['/profile'], {
            fragment: PROFILE_PREFERENCES_FRAGMENT,
            replaceUrl: true,
          }),
        error: (error: unknown) =>
          this.submitError.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'Email already registered.'
              : "Couldn't create your account. Please try again.",
          ),
      });
  }
}
