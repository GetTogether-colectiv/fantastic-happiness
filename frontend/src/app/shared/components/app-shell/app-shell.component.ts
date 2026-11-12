import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MainNavComponent } from '../main-nav/main-nav.component';
import { UserSwitcherComponent } from '../user-switcher/user-switcher.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, MainNavComponent, UserSwitcherComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {}
