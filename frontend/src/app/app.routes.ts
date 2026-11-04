import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'discover', pathMatch: 'full' },
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
      import('./features/discover/discover.component').then((m) => m.DiscoverComponent),
  },
  {
    path: 'swipe',
    data: { title: 'Swipe' },
    loadComponent: () => import('./features/swipe/swipe.component').then((m) => m.SwipeComponent),
  },
  {
    path: 'map',
    data: { title: 'Map' },
    loadComponent: () => import('./features/map/map.component').then((m) => m.MapComponent),
  },
  {
    path: 'my-events',
    data: { title: 'My events' },
    loadComponent: () =>
      import('./features/my-events/my-events.component').then((m) => m.MyEventsComponent),
  },
  {
    path: 'profile',
    data: { title: 'Profile' },
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  { path: '**', redirectTo: 'discover' },
];
