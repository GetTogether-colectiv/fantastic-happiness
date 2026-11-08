import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { EventDetails } from '../../core/models/event.model';
import { CurrentUserService } from '../../core/services/current-user.service';
import { EventDetailsPageComponent } from './event-details-page.component';
import { EventChatComponent } from './sections/event-chat/event-chat.component';
import { EventJoinComponent } from './sections/event-join/event-join.component';

@Component({ selector: 'app-event-join', template: '' })
class JoinStubComponent {
  readonly event = input.required<EventDetails>();
}

@Component({ selector: 'app-event-chat', template: '' })
class ChatStubComponent {
  readonly event = input.required<EventDetails>();
  readonly refresh = vi.fn();
}

const ORGANIZER_ID = 3;
const OTHER_USER_ID = 1;
const USER_STORAGE_KEY = 'currentUserId';

const EVENT: EventDetails = {
  id: 7,
  title: 'Evening concert',
  category: 'MUSIC',
  startsAt: '2999-01-01T18:00:00Z',
  endsAt: '2999-01-01T20:00:00Z',
  city: 'Cluj-Napoca',
  locationName: 'Central Park',
  latitude: null,
  longitude: null,
  imageUrl: null,
  capacity: null,
  goingCount: 0,
  description: null,
  organizerId: ORGANIZER_ID,
  createdAt: '2026-11-01T12:00:00Z',
};

describe('Event details edit button', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.overrideComponent(EventDetailsPageComponent, {
      remove: { imports: [EventJoinComponent, EventChatComponent] },
      add: { imports: [JoinStubComponent, ChatStubComponent] },
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(USER_STORAGE_KEY);
  });

  async function openAs(userId: number): Promise<HTMLElement> {
    TestBed.inject(CurrentUserService).select(userId);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/events/${EVENT.id}`, EventDetailsPageComponent);
    TestBed.tick();
    http.expectOne(`/api/events/${EVENT.id}`).flush(EVENT);
    http.expectOne(`/api/users/${ORGANIZER_ID}`).flush({
      id: ORGANIZER_ID,
      displayName: 'Alex',
      avatarUrl: null,
      city: null,
    });
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  it('links the organizer to the edit form', async () => {
    const root = await openAs(ORGANIZER_ID);

    expect(root.querySelector('a.edit-button')?.getAttribute('href')).toBe(
      `/events/${EVENT.id}/edit`,
    );
  });

  it('hides the button from everyone else', async () => {
    const root = await openAs(OTHER_USER_ID);

    expect(root.querySelector('a.edit-button')).toBeNull();
  });
});
