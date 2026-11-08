import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EventSummary } from '../../core/models/event.model';
import { MyEventsPageComponent } from './my-events-page.component';

@Component({ selector: 'app-swipe-stub', template: '' })
class SwipeStubComponent {}

const UPCOMING_URL = '/api/me/events?when=UPCOMING';
const PAST_URL = '/api/me/events?when=PAST';

function eventSummary(id: number, title: string, startsAt: Date): EventSummary {
  return {
    id,
    title,
    category: 'MUSIC',
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000).toISOString(),
    city: 'Cluj-Napoca',
    locationName: 'Central Park',
    latitude: null,
    longitude: null,
    imageUrl: null,
    capacity: null,
    goingCount: 1,
  };
}

// Starts right now, so it is always labelled "Today" even when the test runs near midnight.
const TODAY_EVENT = eventSummary(1, 'Morning run', new Date());
const TOMORROW = new Date();
const TOMORROW_EVENT = eventSummary(
  2,
  'Street art walk',
  new Date(TOMORROW.getFullYear(), TOMORROW.getMonth(), TOMORROW.getDate() + 1, 12, 0),
);
const PAST_EVENT = eventSummary(3, 'Old concert', new Date(2020, 0, 15, 18, 0));

describe('MyEventsPageComponent', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'my-events', component: MyEventsPageComponent },
          { path: 'swipe', component: SwipeStubComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function open(url = '/my-events'): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, MyEventsPageComponent);
    TestBed.tick();
    return harness.routeNativeElement!;
  }

  function titles(page: HTMLElement): string[] {
    return Array.from(page.querySelectorAll('app-compact-event-card .title')).map((title) =>
      title.textContent!.trim(),
    );
  }

  async function clickTab(page: HTMLElement, index: number): Promise<void> {
    page.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index].click();
    await harness.fixture.whenStable();
    TestBed.tick();
  }

  it('shows a loading skeleton and requests the upcoming events by default', async () => {
    const page = await open();
    harness.detectChanges();

    expect(page.querySelectorAll('app-skeleton-card')).toHaveLength(3);
    expect(page.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
      'Upcoming',
    );
    expect(http.expectOne(UPCOMING_URL).request.method).toBe('GET');
  });

  it('groups upcoming events under Today and Tomorrow headers, keeping the order', async () => {
    const page = await open();
    http.expectOne(UPCOMING_URL).flush([TODAY_EVENT, TOMORROW_EVENT]);
    harness.detectChanges();

    const headers = Array.from(page.querySelectorAll('.day')).map((day) => day.textContent!.trim());
    expect(headers).toEqual(['Today', 'Tomorrow']);
    expect(titles(page)).toEqual(['Morning run', 'Street art walk']);
  });

  it('loads the past events when the tab is in the URL, as a list without day headers', async () => {
    const page = await open('/my-events?tab=past');
    http.expectOne(PAST_URL).flush([PAST_EVENT]);
    harness.detectChanges();

    expect(page.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('Past');
    expect(page.querySelectorAll('.day')).toHaveLength(0);
    expect(titles(page)).toEqual(['Old concert']);
  });

  it('stores the selected tab in the query param and loads that tab', async () => {
    const page = await open();
    http.expectOne(UPCOMING_URL).flush([TODAY_EVENT]);
    harness.detectChanges();

    await clickTab(page, 1);
    expect(TestBed.inject(Location).path()).toBe('/my-events?tab=past');
    http.expectOne(PAST_URL).flush([PAST_EVENT]);
    harness.detectChanges();
    expect(titles(page)).toEqual(['Old concert']);

    await clickTab(page, 0);
    expect(TestBed.inject(Location).path()).toBe('/my-events');
    http.expectOne(UPCOMING_URL).flush([TODAY_EVENT]);
    harness.detectChanges();
    expect(titles(page)).toEqual(['Morning run']);
  });

  it('cancels the upcoming request when the tab changes, so it never fills the past list', async () => {
    const page = await open();
    const upcoming = http.expectOne(UPCOMING_URL);

    await clickTab(page, 1);
    expect(upcoming.cancelled).toBe(true);
    http.expectOne(PAST_URL).flush([PAST_EVENT]);
    harness.detectChanges();

    expect(titles(page)).toEqual(['Old concert']);
  });

  it('shows the upcoming empty state and its button opens Swipe', async () => {
    const page = await open();
    http.expectOne(UPCOMING_URL).flush([]);
    harness.detectChanges();

    expect(page.textContent).toContain("You haven't joined any events yet");
    const button = page.querySelector<HTMLButtonElement>('app-empty-state button')!;
    expect(button.textContent).toContain('Go to Swipe');
    button.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Location).path()).toBe('/swipe');
  });

  it('shows the past empty state without a button', async () => {
    const page = await open('/my-events?tab=past');
    http.expectOne(PAST_URL).flush([]);
    harness.detectChanges();

    expect(page.textContent).toContain('No past events yet');
    expect(page.querySelector('app-empty-state button')).toBeNull();
  });

  it('shows the error state and retries the same tab', async () => {
    const page = await open('/my-events?tab=past');
    http.expectOne(PAST_URL).flush(null, { status: 500, statusText: 'Server Error' });
    harness.detectChanges();

    expect(page.textContent).toContain("We couldn't load your events.");
    page.querySelector<HTMLButtonElement>('app-error-state button')!.click();
    TestBed.tick();
    harness.detectChanges();
    expect(page.querySelectorAll('app-skeleton-card')).toHaveLength(3);

    http.expectOne(PAST_URL).flush([PAST_EVENT]);
    harness.detectChanges();
    expect(page.querySelector('app-error-state')).toBeNull();
    expect(titles(page)).toEqual(['Old concert']);
  });

  it('reloads the list every time the page is entered', async () => {
    await open();
    http.expectOne(UPCOMING_URL).flush([]);

    await harness.navigateByUrl('/swipe');
    await harness.navigateByUrl('/my-events', MyEventsPageComponent);
    TestBed.tick();

    http.expectOne(UPCOMING_URL).flush([TODAY_EVENT]);
    harness.detectChanges();
    expect(titles(harness.routeNativeElement!)).toEqual(['Morning run']);
  });
});
