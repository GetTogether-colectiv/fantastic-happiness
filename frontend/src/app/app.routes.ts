import { Routes } from '@angular/router';
import { LOGIN_PATH, REGISTER_PATH } from './core/auth/auth-navigation';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: LOGIN_PATH,
    data: { title: 'Sign in', hideNavigation: true },
    loadComponent: () =>
      import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: REGISTER_PATH,
    data: { title: 'Create account', hideNavigation: true },
    loadComponent: () =>
      import('./features/auth/register-page.component').then((m) => m.RegisterPageComponent),
  },
  {
    path: '',
    canActivateChild: [authGuard],
    children: (
      [
        { path: '', redirectTo: 'discover', pathMatch: 'full' },
        {
          path: 'events/new',
          data: { title: 'New event' },
          loadComponent: () =>
            import('./features/event-form/event-form-page.component').then(
              (m) => m.EventFormPageComponent,
            ),
        },
        {
          path: 'events/:id/edit',
          data: { title: 'Edit event' },
          loadComponent: () =>
            import('./features/event-form/event-form-page.component').then(
              (m) => m.EventFormPageComponent,
            ),
        },
        {
          path: 'events/:id/chat',
          data: { title: 'Group chat' },
          loadComponent: () =>
            import('./features/event-chat/chat-page.component').then((m) => m.ChatPageComponent),
        },
        {
          path: 'events/:id',
          data: { title: 'Event details' },
          loadComponent: () =>
            import('./features/event-details/event-details-page.component').then(
              (m) => m.EventDetailsPageComponent,
            ),
        },
        {
          path: 'discover',
          data: { title: 'Discover' },
          loadComponent: () =>
            import('./features/discover/discover-page.component').then(
              (m) => m.DiscoverPageComponent,
            ),
        },
        {
          path: 'swipe',
          data: { title: 'Swipe' },
          loadComponent: () =>
            import('./features/swipe/swipe-page.component').then((m) => m.SwipePageComponent),
        },
        {
          path: 'map',
          data: { title: 'Map' },
          loadComponent: () =>
            import('./features/map/map-page.component').then((m) => m.MapPageComponent),
        },
        {
          path: 'my-events',
          data: { title: 'My events' },
          loadComponent: () =>
            import('./features/my-events/my-events-page.component').then(
              (m) => m.MyEventsPageComponent,
            ),
        },
        {
          path: 'profile',
          data: { title: 'Profile' },
          loadComponent: () =>
            import('./features/profile/profile-page.component').then((m) => m.ProfilePageComponent),
        },
        {
          path: 'friends',
          data: { title: 'Friends' },
          loadComponent: () =>
            import('./features/friends/friends-page.component').then((m) => m.FriendsPageComponent),
        },
        {
          path: 'users/:id',
          data: { title: 'Profile' },
          loadComponent: () =>
            import('./features/friends/user-page.component').then((m) => m.UserPageComponent),
        },
        { path: '**', redirectTo: 'discover' },
      ] satisfies Routes
    ).map((route) => ({ ...route, runGuardsAndResolvers: 'always' })),
  },
];
