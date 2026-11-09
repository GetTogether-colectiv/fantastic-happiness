import { Routes } from '@angular/router';

export const routes: Routes = [
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
      import('./features/discover/discover-page.component').then((m) => m.DiscoverPageComponent),
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
    loadComponent: () => import('./features/map/map.component').then((m) => m.MapComponent),
  },
  {
    path: 'my-events',
    data: { title: 'My events' },
    loadComponent: () =>
      import('./features/my-events/my-events-page.component').then((m) => m.MyEventsPageComponent),
  },
  {
    path: 'profile',
    data: { title: 'Profile' },
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  { path: '**', redirectTo: 'discover' },
];
