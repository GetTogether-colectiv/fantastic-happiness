import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { EventDetails } from '../../core/models/event.model';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';
import { EventDetailsPageComponent } from './event-details-page.component';

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
  });

  it('uses browser back after in-app navigation', async () => {
    const harness = await RouterTestingHarness.create('/discover');
    await loadEvent(harness);
    const location = TestBed.inject(Location);
    vi.spyOn(location, 'getState').mockReturnValue({ navigationId: 2 });
    const back = vi.spyOn(location, 'back');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.back-button')!.click();
    expect(back).toHaveBeenCalledOnce();
  });

  it('opens details when an event card is clicked', async () => {
    const harness = await RouterTestingHarness.create('/discover');
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
});
