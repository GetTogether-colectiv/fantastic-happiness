import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EventDetails } from '../../core/models/event.model';
import { CurrentUserService } from '../../core/services/current-user.service';
import { NOMINATIM_REVERSE_URL } from '../../core/services/geocoding.service';
import { EventFormPageComponent } from './event-form-page.component';
import { toInstant } from './event-form.validators';
import { LocationPickerComponent } from './location-picker/location-picker.component';

@Component({ selector: 'app-details-stub', template: '' })
class DetailsStubComponent {}

const ORGANIZER_ID = 3;
const OTHER_USER_ID = 1;
const START = '2999-01-01T10:00';
const END = '2999-01-01T12:00';
const USER_STORAGE_KEY = 'currentUserId';

const EVENT: EventDetails = {
  id: 7,
  title: 'Evening concert',
  category: 'MUSIC',
  startsAt: toInstant(START),
  endsAt: toInstant(END),
  city: 'Cluj-Napoca',
  locationName: 'Central Park',
  latitude: null,
  longitude: null,
  imageUrl: null,
  capacity: 30,
  goingCount: 0,
  description: 'Live music.',
  organizerId: ORGANIZER_ID,
  createdAt: '2026-11-01T12:00:00Z',
};

describe('EventFormPageComponent', () => {
  const snackBar = { open: vi.fn() };
  let http: HttpTestingController;

  beforeEach(() => {
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'events/new', component: EventFormPageComponent },
          { path: 'events/:id/edit', component: EventFormPageComponent },
          { path: 'events/:id', component: DetailsStubComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(USER_STORAGE_KEY);
  });

  function field(
    root: HTMLElement,
    id: string,
  ): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
    const element = root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `#${id}`,
    );
    if (!element) {
      throw new Error(`Missing field ${id}`);
    }
    return element;
  }

  function fill(root: HTMLElement, id: string, value: string): void {
    const element = field(root, id);
    element.value = value;
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input'));
  }

  function leave(root: HTMLElement, id: string): void {
    field(root, id).dispatchEvent(new Event('blur'));
  }

  function fillValidForm(root: HTMLElement): void {
    fill(root, 'title', 'Board game night');
    fill(root, 'category', 'OTHER');
    fill(root, 'startsAt', START);
    fill(root, 'endsAt', END);
    fill(root, 'locationName', 'Game Cafe');
    fill(root, 'city', 'Cluj-Napoca');
  }

  function submitButton(root: HTMLElement): HTMLButtonElement {
    const button = root.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!button) {
      throw new Error('Missing submit button');
    }
    return button;
  }

  async function openForm(url: string) {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, EventFormPageComponent);
    harness.detectChanges();
    return harness;
  }

  it('keeps Create disabled until the form is valid', async () => {
    const harness = await openForm('/events/new');
    const root = harness.routeNativeElement as HTMLElement;

    expect(submitButton(root).disabled).toBe(true);
    expect(submitButton(root).textContent).toContain('Create');

    fillValidForm(root);
    harness.detectChanges();

    expect(submitButton(root).disabled).toBe(false);
  });

  it('shows errors under a field once it is left', async () => {
    const harness = await openForm('/events/new');
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.textContent).not.toContain('Title is required');

    leave(root, 'title');
    fill(root, 'startsAt', '2000-01-01T10:00');
    leave(root, 'startsAt');
    fill(root, 'endsAt', '1999-01-01T10:00');
    leave(root, 'endsAt');
    harness.detectChanges();

    expect(root.textContent).toContain('Title is required');
    expect(root.textContent).toContain("Start can't be in the past");
    expect(root.textContent).toContain('End must be after start');
  });

  it('creates the event, opens its details and shows a message', async () => {
    const harness = await openForm('/events/new');
    const root = harness.routeNativeElement as HTMLElement;
    fillValidForm(root);
    harness.detectChanges();

    submitButton(root).click();

    const pending = http.expectOne('/api/events');
    expect(pending.request.method).toBe('POST');
    expect(pending.request.body).toEqual({
      title: 'Board game night',
      description: null,
      category: 'OTHER',
      startsAt: toInstant(START),
      endsAt: toInstant(END),
      locationName: 'Game Cafe',
      city: 'Cluj-Napoca',
      capacity: null,
      imageUrl: null,
      latitude: null,
      longitude: null,
    });
    pending.flush({ ...EVENT, id: 9 });

    await vi.waitFor(() => expect(snackBar.open).toHaveBeenCalled());
    expect(TestBed.inject(Router).url).toBe('/events/9');
    expect(snackBar.open.mock.calls[0][0]).toBe('Event created');
  });

  it('puts backend field errors back on the fields', async () => {
    const harness = await openForm('/events/new');
    const root = harness.routeNativeElement as HTMLElement;
    fillValidForm(root);
    harness.detectChanges();

    submitButton(root).click();
    http
      .expectOne('/api/events')
      .flush(
        { status: 400, message: 'Validation failed', fieldErrors: { title: 'Title is required' } },
        { status: 400, statusText: 'Bad Request' },
      );
    harness.detectChanges();

    expect(root.textContent).toContain('Title is required');
    expect(submitButton(root).disabled).toBe(true);
  });

  it('fills the form for the organizer and saves the changes', async () => {
    TestBed.inject(CurrentUserService).select(ORGANIZER_ID);
    const harness = await openForm(`/events/${EVENT.id}/edit`);
    http.expectOne(`/api/events/${EVENT.id}`).flush(EVENT);
    harness.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;

    expect(field(root, 'title').value).toBe('Evening concert');
    expect(field(root, 'category').value).toBe('MUSIC');
    expect(field(root, 'capacity').value).toBe('30');
    expect(submitButton(root).textContent).toContain('Save changes');
    expect(submitButton(root).disabled).toBe(false);

    fill(root, 'title', 'Night concert');
    harness.detectChanges();
    submitButton(root).click();

    const pending = http.expectOne(`/api/events/${EVENT.id}`);
    expect(pending.request.method).toBe('PUT');
    expect(pending.request.body.title).toBe('Night concert');
    pending.flush({ ...EVENT, title: 'Night concert' });

    await vi.waitFor(() => expect(snackBar.open).toHaveBeenCalled());
    expect(snackBar.open.mock.calls[0][0]).toBe('Changes saved');
  });

  it('sends anyone but the organizer back to the details page', async () => {
    TestBed.inject(CurrentUserService).select(OTHER_USER_ID);
    const harness = await openForm(`/events/${EVENT.id}/edit`);
    http.expectOne(`/api/events/${EVENT.id}`).flush(EVENT);

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe(`/events/${EVENT.id}`));
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
  });

  it('fills in the location name and city from the picked point, keeping them editable', async () => {
    const harness = await openForm('/events/new');
    const root = harness.routeNativeElement as HTMLElement;
    const picker = harness.fixture.debugElement.query(By.directive(LocationPickerComponent))
      .componentInstance as LocationPickerComponent;

    picker.picked.emit({ latitude: 46.77, longitude: 23.59 });
    http
      .expectOne((request) => request.url === NOMINATIM_REVERSE_URL)
      .flush({ name: 'Central Park', address: { city: 'Cluj-Napoca' } });
    harness.detectChanges();

    expect(field(root, 'locationName').value).toBe('Central Park');
    expect(field(root, 'city').value).toBe('Cluj-Napoca');

    fill(root, 'city', 'Florești');
    harness.detectChanges();

    expect(field(root, 'city').value).toBe('Florești');
  });
});
