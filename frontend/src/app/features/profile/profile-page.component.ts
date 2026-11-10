import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { UsersService } from '../../core/services/users.service';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import { CategoryPickerComponent } from '../../shared/components/category-picker/category-picker.component'
type ProfileState = 'loading' | 'loaded' | 'error';

// These limits must match the validation in UpdateProfileRequest on the backend.
const NAME_MAX_LENGTH = 100;
const CITY_MAX_LENGTH = 100;
const AVATAR_URL_MAX_LENGTH = 500;
const HTTP_URL_PATTERN = /^https?:\/\/\S+$/;
const NOT_BLANK_PATTERN = /\S/;

@Component({
  selector: 'app-profile-page',
  imports: [
    ReactiveFormsModule,
    MatIcon,
    CategoryPickerComponent,
    ErrorStateComponent,
    SkeletonCardComponent,
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
  private readonly usersService = inject(UsersService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly profile = this.usersService.profile;
  protected readonly state = signal<ProfileState>('loading');
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveFailed = signal(false);
  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly form = inject(NonNullableFormBuilder).group({
    displayName: [
      '',
      [
        Validators.required,
        Validators.pattern(NOT_BLANK_PATTERN),
        Validators.maxLength(NAME_MAX_LENGTH),
      ],
    ],
    city: ['', Validators.maxLength(CITY_MAX_LENGTH)],
    avatarUrl: [
      '',
      [Validators.pattern(HTTP_URL_PATTERN), Validators.maxLength(AVATAR_URL_MAX_LENGTH)],
    ],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.usersService
      .loadProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.state.set('loaded'),
        error: () => this.state.set('error'),
      });
  }

  protected edit(): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }
    this.form.reset({
      displayName: profile.displayName,
      city: profile.city ?? '',
      avatarUrl: profile.avatarUrl ?? '',
    });
    this.saveFailed.set(false);
    this.editing.set(true);
  }

  protected cancel(): void {
    this.editing.set(false);
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { displayName, city, avatarUrl } = this.form.getRawValue();
    this.saving.set(true);
    this.saveFailed.set(false);
    this.usersService
      .updateProfile({
        displayName: displayName.trim(),
        city: city.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing.set(false);
        },
        error: () => {
          this.saving.set(false);
          this.saveFailed.set(true);
        },
      });
  }
}
