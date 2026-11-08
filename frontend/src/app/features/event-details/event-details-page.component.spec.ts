import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { EventDetails } from '../../core/models/event.model';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';
import { EventDetailsPageComponent } from './event-details-page.component';
import { EventChatComponent } from './sections/event-chat/event-chat.component';
import { EventFriendsComponent } from './sections/event-friends/event-friends.component';
import { EventJoinComponent } from './sections/event-join/event-join.component';
import { EventMapComponent } from './sections/event-map/event-map.component';
import { EventPostsComponent } from './sections/event-posts/event-posts.component';

@Component({
  selector: 'app-event-join',
  template: '',
})
class JoinStubComponent {
  readonly event = input.required<EventDetails>();
}

@Component({
  selector: 'app-event-chat',
  template: '',
})
class ChatStubComponent {
  readonly event = input.required<EventDetails>();
  readonly refresh = vi.fn();
}

@Component({
  selector: 'app-event-join',
  template: '<button type="button">Join {{ event().title }}</button>',
})
class PopulatedJoinComponent {
  readonly event = input.required<EventDetails>();
}

const EVENT: EventDetails = {
  id: 7,
  title: 'Evening concert',
  category: 'MUSIC',
  startsAt: '2026-11-10T18:00:00Z',
  endsAt: '2026-11-10T20:00:00Z',
  city: 'Cluj-Napoca',
  locationName: 'Central Park',
  latitude: null,
  longitude: null,
  imageUrl: '/concert.jpg',
  capacity: 30,
  goingCount: 0,
  description: 'Live music.\nEveryone is welcome.',
  organizerId: 3,
  createdAt: '2026-11-01T12:00:00Z',
};

describe('Event details navigation', () => {
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

  afterEach(() => http.verify());

  async function loadEvent(harness: RouterTestingHarness, event = EVENT): Promise<void> {
    await harness.navigateByUrl(`/events/${event.id}`, EventDetailsPageComponent);
    TestBed.tick();
    http.expectOne(`/api/events/${event.id}`).flush(event);
    http.expectOne(`/api/users/${event.organizerId}`).flush({
      id: 3,
      displayName: 'Alex',
      avatarUrl: '/alex.jpg',
      city: 'Cluj-Napoca',
    });
    harness.detectChanges();
  }

  it('loads the requested event and renders its details and organizer', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/events/7', EventDetailsPageComponent);
    TestBed.tick();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Loading event details');

    http.expectOne('/api/events/7').flush(EVENT);
    http.expectOne('/api/users/3').flush({ id: 3, displayName: 'Alex', avatarUrl: '/alex.jpg' });
    harness.detectChanges();

    const page = harness.routeNativeElement!;
    expect(page.textContent).toContain(EVENT.title);
    expect(page.textContent).toContain(EVENT.description);
    expect(page.textContent).toContain('Central Park, Cluj-Napoca');
    expect(page.textContent).toContain('30 places');
    expect(page.textContent).toContain('Alex');
    expect(page.querySelector('.cover-image')?.getAttribute('src')).toBe(EVENT.imageUrl);
    expect(page.querySelectorAll('time')[0].getAttribute('datetime')).toBe(EVENT.startsAt);
    expect(page.querySelectorAll('time')[1].getAttribute('datetime')).toBe(EVENT.endsAt);
    expect(page.querySelector('.avatar')?.getAttribute('src')).toBe('/alex.jpg');
  });

  it('loads another event when only the route id changes', async () => {
    const harness = await RouterTestingHarness.create();
    await loadEvent(harness);
    await loadEvent(harness, { ...EVENT, id: 8, title: 'Another concert' });
    expect(harness.routeNativeElement?.textContent).toContain('Another concert');
    expect(harness.routeNativeElement?.textContent).not.toContain(EVENT.title);
  });

  it('keeps event details available when the organizer cannot be loaded', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/events/7', EventDetailsPageComponent);
    TestBed.tick();
    http
      .expectOne('/api/events/7')
      .flush({ ...EVENT, capacity: null, description: null, imageUrl: null });
    http.expectOne('/api/users/3').flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(EVENT.title);
    expect(harness.routeNativeElement?.textContent).toContain('No capacity limit');
    expect(harness.routeNativeElement?.textContent).toContain('Organizer information unavailable');
    expect(harness.routeNativeElement?.querySelector('#description-title')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('.cover-image')).toBeNull();
  });

  it('returns a direct visitor to Discover', async () => {
    const harness = await RouterTestingHarness.create();
    await loadEvent(harness);
    vi.spyOn(TestBed.inject(Location), 'getState').mockReturnValue({ navigationId: 1 });
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.back-button')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Location).path()).toBe('/discover');
    http.expectOne('/api/events?page=0&size=10').flush({
      content: [],
      page: 0,
      totalPages: 0,
      last: true,
    });
  });

  it('uses browser back after in-app navigation', async () => {
    const harness = await RouterTestingHarness.create('/discover');
    http.expectOne('/api/events?page=0&size=10').flush({
      content: [],
      page: 0,
      totalPages: 0,
      last: true,
    });
    await loadEvent(harness);
    const location = TestBed.inject(Location);
    vi.spyOn(location, 'getState').mockReturnValue({ navigationId: 2 });
    const back = vi.spyOn(location, 'back');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.back-button')!.click();
    expect(back).toHaveBeenCalledOnce();
  });

  it('opens details when an event card is clicked', async () => {
    const harness = await RouterTestingHarness.create('/discover');
    http.expectOne('/api/events?page=0&size=10').flush({
      content: [],
      page: 0,
      totalPages: 0,
      last: true,
    });
    const card = TestBed.createComponent(EventCardComponent);
    card.componentRef.setInput('event', EVENT);
    card.detectChanges();
    card.nativeElement.querySelector('a').click();
    await harness.fixture.whenStable();
    TestBed.tick();
    expect(TestBed.inject(Location).path()).toBe('/events/7');
    http.expectOne('/api/events/7').flush(EVENT);
    http.expectOne('/api/users/3').flush({ id: 3, displayName: 'Alex', avatarUrl: null });
  });

  it('shows the not-found state for a missing event and returns to Discover', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/events/999999', EventDetailsPageComponent);
    TestBed.tick();
    http.expectOne('/api/events/999999').flush(null, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();

    const page = harness.routeNativeElement!;
    expect(page.textContent).toContain("This event doesn't exist");
    expect(page.querySelector('article')).toBeNull();
    expect(page.querySelector('app-error-state')).toBeNull();
    const button = page.querySelector<HTMLButtonElement>('app-empty-state button')!;
    expect(button.textContent).toContain('Back to Discover');
    button.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Location).path()).toBe('/discover');
    http.expectOne('/api/events?page=0&size=10').flush({
      content: [],
      page: 0,
      totalPages: 0,
      last: true,
    });
  });

  it.each(['abc', '0', '-1', '1.5', '9007199254740992'])(
    'shows not-found for invalid id %s without making a request',
    async (id) => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(`/events/${id}`, EventDetailsPageComponent);
      TestBed.tick();
      harness.detectChanges();
      expect(harness.routeNativeElement?.textContent).toContain("This event doesn't exist");
      http.expectNone((request) => request.url.startsWith('/api/'));
    },
  );

  it.each([0, 403, 500])('shows the generic error state for status %s', async (status) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/events/7', EventDetailsPageComponent);
    TestBed.tick();
    const request = http.expectOne('/api/events/7');
    if (status === 0) {
      request.error(new ProgressEvent('error'));
    } else {
      request.flush(null, { status, statusText: 'Request failed' });
    }
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Something went wrong.');
    expect(harness.routeNativeElement?.querySelector('app-empty-state')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('article')).toBeNull();
  });

  it('retries a failed event request and renders the recovered event', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/events/7', EventDetailsPageComponent);
    TestBed.tick();
    http.expectOne('/api/events/7').flush(null, { status: 500, statusText: 'Server Error' });
    harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('app-error-state button')!.click();
    TestBed.tick();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Loading event details');
    http.expectOne('/api/events/7').flush(EVENT);
    http.expectOne('/api/users/3').flush({ id: 3, displayName: 'Alex', avatarUrl: null });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain(EVENT.title);
    expect(harness.routeNativeElement?.querySelector('app-error-state')).toBeNull();
  });

  it('loads a valid event after navigating away from a missing event', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/events/999999', EventDetailsPageComponent);
    TestBed.tick();
    http.expectOne('/api/events/999999').flush(null, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    await loadEvent(harness);
    expect(harness.routeNativeElement?.textContent).toContain(EVENT.title);
    expect(harness.routeNativeElement?.querySelector('app-empty-state')).toBeNull();
  });

  it('keeps the event visible when only the organizer returns 404', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/events/7', EventDetailsPageComponent);
    TestBed.tick();
    http.expectOne('/api/events/7').flush(EVENT);
    http.expectOne('/api/users/3').flush(null, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain(EVENT.title);
    expect(harness.routeNativeElement?.textContent).toContain('Organizer information unavailable');
    expect(harness.routeNativeElement?.querySelector('app-empty-state')).toBeNull();
  });

  it('passes the current event to all five sections without rendering placeholder content', async () => {
    const harness = await RouterTestingHarness.create();
    await loadEvent(harness);
    const nextEvent = { ...EVENT, id: 8, title: 'Another concert' };
    await loadEvent(harness, nextEvent);

    const sectionComponents = [
      JoinStubComponent,
      EventMapComponent,
      ChatStubComponent,
      EventFriendsComponent,
      EventPostsComponent,
    ];
    expect(harness.routeNativeElement?.querySelectorAll('.event-section')).toHaveLength(5);
    for (const component of sectionComponents) {
      const section = harness.routeDebugElement!.query(By.directive(component));
      expect(section.componentInstance.event()).toEqual(nextEvent);
      expect(section.nativeElement.textContent).toBe('');
      expect(section.nativeElement.childElementCount).toBe(0);
    }
  });
});

describe('Event details section extension', () => {
  it('renders a section implemented by its owner without changing the page layout', async () => {
    TestBed.configureTestingModule({
      imports: [EventDetailsPageComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.overrideComponent(EventDetailsPageComponent, {
      remove: { imports: [EventJoinComponent, EventChatComponent] },
      add: { imports: [PopulatedJoinComponent, ChatStubComponent] },
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/events/7', EventDetailsPageComponent);
    TestBed.tick();
    http.expectOne('/api/events/7').flush(EVENT);
    http.expectOne('/api/users/3').flush({ id: 3, displayName: 'Alex', avatarUrl: null });
    harness.detectChanges();

    expect(
      harness.routeNativeElement?.querySelector('.event-section--join button')?.textContent,
    ).toBe(`Join ${EVENT.title}`);
    expect(harness.routeNativeElement?.querySelector('app-event-map')?.textContent).toBe('');
    http.verify();
  });
});
