import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { emailValidators, notBlankValidator } from './auth.validators';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, MatIcon],
  templateUrl: './login-page.component.html',
  styleUrl: './auth-page.scss',
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', emailValidators],
    password: ['', notBlankValidator],
  });
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);

  protected submit(): void {
    if (this.submitting()) return;

    this.submitError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .login({ email: email.trim(), password })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl('/', { replaceUrl: true }),
        error: (error: unknown) =>
          this.submitError.set(
            error instanceof HttpErrorResponse && error.status === 401
              ? 'Email or password is incorrect'
              : "Couldn't sign in. Please try again.",
          ),
      });
  }
}
