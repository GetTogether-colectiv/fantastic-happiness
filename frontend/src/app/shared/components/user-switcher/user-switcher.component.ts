import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { User } from '../../../core/models/user.model';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-user-switcher',
  templateUrl: './user-switcher.component.html',
  styleUrl: './user-switcher.component.scss',
})
export class UserSwitcherComponent {
  private readonly router = inject(Router);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly usersService = inject(UsersService);
  private readonly loadedUsers = toSignal(this.usersService.findAll(), { initialValue: [] });

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
  protected readonly currentUser = computed(() =>
    this.users().find((user) => user.id === this.currentUserService.userId()),
  );

  protected toggle(): void {
    this.open.update((isOpen) => !isOpen);
  }

  protected select(user: User): void {
    this.open.set(false);
    this.currentUserService.select(user.id);
    const url = this.router.url;
    this.router
      .navigateByUrl('/', { skipLocationChange: true })
      .then(() => this.router.navigateByUrl(url));
  }
}
