import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { MainNavComponent } from '../main-nav/main-nav.component';
import { UserSwitcherComponent } from '../user-switcher/user-switcher.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, MainNavComponent, UserSwitcherComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly router = inject(Router);

  protected readonly showNavigation = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.hasNavigation()),
    ),
    { initialValue: this.hasNavigation() },
  );

  private hasNavigation(): boolean {
    const page = this.router.routerState.snapshot.root.firstChild;
    return page !== null && page.data['hideNavigation'] !== true;
  }
}
