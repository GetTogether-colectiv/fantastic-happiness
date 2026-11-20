import { Component, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { AvatarComponent } from '../avatar/avatar.component';
import { MainNavComponent } from '../main-nav/main-nav.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, MainNavComponent, AvatarComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);

  protected readonly showNavigation = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.hasNavigation()),
    ),
    { initialValue: this.hasNavigation() },
  );

  protected readonly profileUser = computed(() => {
    const signedInUser = this.auth.currentUser();
    return signedInUser && (this.users.profile() ?? signedInUser);
  });

  constructor() {
    effect((onCleanup) => {
      if (!this.showNavigation() || !this.auth.session() || untracked(this.users.profile)) return;

      const request = this.users.loadProfile().subscribe({ error: () => undefined });
      onCleanup(() => request.unsubscribe());
    });
  }

  private hasNavigation(): boolean {
    const page = this.router.routerState.snapshot.root.firstChild;
    return page !== null && page.data['hideNavigation'] !== true;
  }
}
