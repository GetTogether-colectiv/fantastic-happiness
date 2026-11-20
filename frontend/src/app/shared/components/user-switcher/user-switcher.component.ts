import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-user-switcher',
  templateUrl: './user-switcher.component.html',
  styleUrl: './user-switcher.component.scss',
})
export class UserSwitcherComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly usersService = inject(UsersService);
  private readonly loadedUsers = toSignal(
    this.usersService.findAll().pipe(catchError(() => of([]))),
    {
      initialValue: [],
    },
  );

  /** The loaded list with the edited profile applied, so a new name or avatar shows without a reload. */
  protected readonly users = computed(() => {
    const profile = this.usersService.profile();
    return this.loadedUsers().map((user) =>
      user.id === profile?.id
        ? {
            ...user,
            displayName: profile.displayName,
            city: profile.city,
            avatarUrl: profile.avatarUrl,
          }
        : user,
    );
  });
  protected readonly open = signal(false);
  protected readonly signedIn = computed(() => this.auth.currentUser() !== null);
  protected readonly currentUser = computed(
    () =>
      this.users().find((user) => user.id === this.currentUserService.userId()) ??
      this.auth.currentUser(),
  );

  protected toggle(): void {
    if (this.signedIn()) return;

    this.open.update((isOpen) => !isOpen);
  }

  protected select(user: User): void {
    this.open.set(false);
    if (this.signedIn()) return;

    this.currentUserService.select(user.id);
    const url = this.router.url;
    this.router
      .navigateByUrl('/', { skipLocationChange: true })
      .then(() => this.router.navigateByUrl(url));
  }
}
