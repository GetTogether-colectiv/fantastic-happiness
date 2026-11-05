import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventDetails } from '../../../../core/models/event.model';
import { ParticipationStatus } from '../../../../core/models/participation.model';
import { EventJoinComponent } from './event-join.component';

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
  imageUrl: null,
  capacity: 30,
  goingCount: 99,
  description: null,
  organizerId: 3,
  createdAt: '2026-11-01T12:00:00Z',
};

const URL = '/api/events/7/participation';
const NEXT_URL = '/api/events/8/participation';

describe('EventJoinComponent', () => {
  let fixture: ComponentFixture<EventJoinComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EventJoinComponent);
    fixture.componentRef.setInput('event', EVENT);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    fixture.destroy();
  });

  function load(
    status: ParticipationStatus | null = null,
    goingCount = 12,
    capacity: number | null = 30,
  ): void {
    const request = http.expectOne(URL);
    expect(request.request.method).toBe('GET');
    request.flush({ status, goingCount, capacity });
    fixture.detectChanges();
  }

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  function click(): void {
    button().click();
    fixture.detectChanges();
  }

  function count(): string {
    return fixture.nativeElement.querySelector('.count').textContent.trim();
  }

  it('requests participation and shows loading without actions until GET completes', () => {
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Loading participation',
    );
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('section').getAttribute('aria-busy')).toBe('true');
    load();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    expect(count()).toBe('12 going');
  });

  it.each([null, 'NOT_INTERESTED'] as const)('shows GOING for status %s', (status) => {
    load(status);
    expect(button().textContent.trim()).toBe('GOING');
    expect(button().disabled).toBe(false);
  });

  it('shows Leave, the going count and capacity for a GOING user', () => {
    load('GOING', 12, 30);
    expect(button().textContent.trim()).toBe('Leave');
    expect(count()).toBe('12 going');
    expect(fixture.nativeElement.querySelector('.capacity').textContent.trim()).toBe('30 places');
  });

  it('displays unlimited capacity from the participation response', () => {
    load(null, 12, null);
    expect(fixture.nativeElement.querySelector('.capacity').textContent.trim()).toBe(
      'No capacity limit',
    );
  });

  it('provides a retry after GET failure and prevents repeated retry requests while loading', () => {
    http.expectOne(URL).flush(null, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-error-state')).not.toBeNull();
    expect(button().textContent.trim()).toBe('Try again');
    click();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    load('GOING');
    expect(button().textContent.trim()).toBe('Leave');
    expect(fixture.nativeElement.querySelector('app-error-state')).toBeNull();
  });

  it('updates status, count and capacity from a successful PUT without manually incrementing', () => {
    load('NOT_INTERESTED', 12, 30);
    click();
    const request = http.expectOne(URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ status: 'GOING' });
    expect(button().disabled).toBe(true);
    expect(count()).toBe('12 going');
    request.flush({ status: 'GOING', goingCount: 20, capacity: 45 });
    fixture.detectChanges();
    expect(count()).toBe('20 going');
    expect(fixture.nativeElement.querySelector('.capacity').textContent.trim()).toBe('45 places');
    expect(button().textContent.trim()).toBe('Leave');
    expect(button().disabled).toBe(false);
  });

  it.each([12, 1, 0])(
    'clears status and decrements count %s after successful DELETE without going negative',
    (goingCount) => {
      load('GOING', goingCount);
      click();
      const request = http.expectOne(URL);
      expect(request.request.method).toBe('DELETE');
      expect(count()).toBe(`${goingCount} going`);
      request.flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();
      expect(count()).toBe(`${Math.max(0, goingCount - 1)} going`);
      expect(button().textContent.trim()).toBe('GOING');
      expect(button().disabled).toBe(false);
      http.expectNone(URL);
    },
  );

  it.each([null, 'GOING'] as const)(
    'prevents duplicate actions when the initial status is %s',
    (status) => {
      load(status);
      click();
      expect(button().disabled).toBe(true);
      // Dispatch directly to exercise the guard even if a disabled button receives an event.
      button().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      const request = http.expectOne(URL);
      expect(request.request.method).toBe(status === 'GOING' ? 'DELETE' : 'PUT');
      request.flush(status === 'GOING' ? null : { status: 'GOING', goingCount: 13, capacity: 30 });
      fixture.detectChanges();
      expect(button().disabled).toBe(false);
    },
  );

  it('preserves status and count on EVENT_FULL and allows a successful retry', () => {
    load(null, 12);
    click();
    http.expectOne(URL).flush({ message: 'EVENT_FULL' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent.trim()).toBe(
      'This event is full',
    );
    expect(count()).toBe('12 going');
    expect(button().textContent.trim()).toBe('GOING');
    expect(button().disabled).toBe(false);
    click();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    http.expectOne(URL).flush({ status: 'GOING', goingCount: 15, capacity: 30 });
    fixture.detectChanges();
    expect(count()).toBe('15 going');
    expect(button().textContent.trim()).toBe('Leave');
  });

  it.each([null, 'GOING'] as const)(
    'preserves participation and count on an action error for status %s',
    (status) => {
      load(status, 12);
      click();
      http.expectOne(URL).flush(null, { status: 503, statusText: 'Unavailable' });
      fixture.detectChanges();
      expect(count()).toBe('12 going');
      expect(button().textContent.trim()).toBe(status === 'GOING' ? 'Leave' : 'GOING');
      expect(button().disabled).toBe(false);
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
        'Please try again',
      );
      click();
      const retry = http.expectOne(URL);
      expect(retry.request.method).toBe(status === 'GOING' ? 'DELETE' : 'PUT');
      retry.flush(status === 'GOING' ? null : { status: 'GOING', goingCount: 13, capacity: 30 });
      fixture.detectChanges();
      expect(count()).toBe(status === 'GOING' ? '11 going' : '13 going');
    },
  );

  it.each(['GET', 'PUT', 'DELETE'])(
    'cancels pending %s and resets state when the event ID changes',
    (method) => {
      if (method !== 'GET') {
        load(method === 'DELETE' ? 'GOING' : null);
        click();
      }
      const oldRequest = http.expectOne(URL);
      expect(oldRequest.request.method).toBe(method);
      fixture.componentRef.setInput('event', { ...EVENT, id: 8 });
      fixture.detectChanges();
      expect(oldRequest.cancelled).toBe(true);
      expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.count')).toBeNull();
      expect(fixture.nativeElement.querySelector('button')).toBeNull();
      http.expectOne(NEXT_URL).flush({ status: 'GOING', goingCount: 4, capacity: 10 });
      fixture.detectChanges();
      expect(count()).toBe('4 going');
      expect(button().textContent.trim()).toBe('Leave');
      expect(() => oldRequest.flush({ status: null, goingCount: 99, capacity: 100 })).toThrow();
      expect(count()).toBe('4 going');
    },
  );

  it('clears the previous action error when a different event is displayed', () => {
    load();
    click();
    http.expectOne(URL).flush({ message: 'EVENT_FULL' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    fixture.componentRef.setInput('event', { ...EVENT, id: 8 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    http.expectOne(NEXT_URL).flush({ status: null, goingCount: 2, capacity: 10 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(count()).toBe('2 going');
  });

  it('does not reload when the event object changes but its ID stays the same', () => {
    load();
    fixture.componentRef.setInput('event', { ...EVENT, title: 'Updated title' });
    fixture.detectChanges();
    http.expectNone(URL);
    expect(count()).toBe('12 going');
  });

  it.each(['GET', 'PUT', 'DELETE'])(
    'cancels pending %s when the section is destroyed',
    (method) => {
      if (method !== 'GET') {
        load(method === 'DELETE' ? 'GOING' : null);
        click();
      }
      const request = http.expectOne(URL);
      fixture.destroy();
      expect(request.cancelled).toBe(true);
    },
  );
});
