import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig } from '@angular/material/dialog';
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
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MAT_DIALOG_DEFAULT_OPTIONS,
          useValue: {
            ...new MatDialogConfig(),
            enterAnimationDuration: 0,
            exitAnimationDuration: 0,
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EventJoinComponent);
    fixture.componentRef.setInput('event', EVENT);
    fixture.detectChanges();
  });

  afterEach(async () => {
    http.verify();
    fixture.destroy();
    await vi.runAllTimersAsync();
    vi.useRealTimers();
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

  async function click(): Promise<void> {
    button().click();
    fixture.detectChanges();
    const confirmation = document.querySelector<HTMLButtonElement>(
      'mat-dialog-actions button.leave',
    );
    if (confirmation) {
      confirmation.click();
      await vi.runAllTimersAsync();
      await fixture.whenStable();
      fixture.detectChanges();
    }
  }

  function count(): string {
    return fixture.nativeElement.querySelector('.count').textContent.trim();
  }

  async function closeConfirmation(selector: string): Promise<void> {
    const action = document.querySelector<HTMLButtonElement>(`mat-dialog-actions ${selector}`);
    expect(action).not.toBeNull();
    action!.click();
    await vi.runAllTimersAsync();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('uses the themed green join style and a destructive leave outline', () => {
    load();
    expect(button().classList.contains('join')).toBe(true);
    expect(button().classList.contains('leave')).toBe(false);
  });

  it('opens an accessible leave confirmation without sending DELETE', async () => {
    load('GOING');
    button().focus();
    button().click();
    fixture.detectChanges();
    await vi.runAllTimersAsync();
    await fixture.whenStable();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(document.querySelector('#leave-event-title')?.textContent).toBe('Leave this event?');
    expect(document.querySelector('#leave-event-message')?.textContent?.trim()).toBe(
      'Are you sure you no longer want to attend this event?',
    );
    expect(dialog?.getAttribute('aria-labelledby')).toBe('leave-event-title');
    expect(dialog?.getAttribute('aria-describedby')).toBe('leave-event-message');
    expect(document.activeElement?.textContent?.trim()).toBe('Cancel');
    expect(button().classList.contains('leave')).toBe(true);
    http.expectNone(URL);
    button().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    await closeConfirmation('.cancel-leave');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(button());
    expect(button().textContent.trim()).toBe('Leave event');
    expect(count()).toBe('12 going');
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
    http.expectNone(URL);
  });

  it('sends DELETE only after Yes, leave and shows feedback only after success', async () => {
    load('GOING');
    button().click();
    fixture.detectChanges();
    http.expectNone(URL);
    await closeConfirmation('.leave');
    const request = http.expectOne(URL);
    expect(request.request.method).toBe('DELETE');
    expect(button().disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
    expect(count()).toBe('12 going');
    request.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    expect(count()).toBe('11 going');
    expect(fixture.nativeElement.querySelector('.success[role="status"]').textContent.trim()).toBe(
      "You've left this event.",
    );
  });

  it('shows join success only after PUT succeeds and clears it when leave is cancelled', async () => {
    load();
    await click();
    const request = http.expectOne(URL);
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
    request.flush({ status: 'GOING', goingCount: 13, capacity: 30 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success[role="status"]').textContent.trim()).toBe(
      "You're going to this event!",
    );
    button().click();
    fixture.detectChanges();
    await closeConfirmation('.cancel-leave');
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
    expect(count()).toBe('13 going');
    http.expectNone(URL);
  });

  it.each([null, 'GOING'] as const)(
    'dismisses success after exactly three seconds for initial status %s',
    async (status) => {
      load(status);
      await click();
      http
        .expectOne(URL)
        .flush(status === 'GOING' ? null : { status: 'GOING', goingCount: 13, capacity: 30 });
      fixture.detectChanges();
      const expected =
        status === 'GOING' ? "You've left this event." : "You're going to this event!";
      const feedback = fixture.nativeElement.querySelector('.success');
      expect(feedback.textContent.trim()).toBe(expected);
      expect(feedback.getAttribute('aria-live')).toBe('polite');

      await vi.advanceTimersByTimeAsync(2999);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.success').textContent.trim()).toBe(expected);
      await vi.advanceTimersByTimeAsync(1);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.success')).toBeNull();
      expect(count()).toBe(status === 'GOING' ? '11 going' : '13 going');
      expect(button().textContent.trim()).toBe(status === 'GOING' ? 'I want to go' : 'Leave event');
      http.expectNone(URL);
    },
  );

  it('resets the dismissal timer when a later action succeeds', async () => {
    load();
    await click();
    http.expectOne(URL).flush({ status: 'GOING', goingCount: 13, capacity: 30 });
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(2000);
    await click();
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
    http.expectOne(URL).flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    // The original join message would have expired now; leave feedback must stay visible.
    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success').textContent.trim()).toBe(
      "You've left this event.",
    );
    await vi.advanceTimersByTimeAsync(1999);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
  });

  it('clears leave feedback immediately when another join starts, even if the join fails', async () => {
    load('GOING');
    await click();
    http.expectOne(URL).flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success')).not.toBeNull();
    await click();
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
    http.expectOne(URL).flush({ message: 'EVENT_FULL' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(3000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent.trim()).toBe(
      'This event is full',
    );
  });

  it('cleans up the timer on event changes so old feedback cannot dismiss a new success', async () => {
    load();
    await click();
    http.expectOne(URL).flush({ status: 'GOING', goingCount: 13, capacity: 30 });
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1000);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    fixture.componentRef.setInput('event', { ...EVENT, id: 8 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    http.expectOne(NEXT_URL).flush({ status: null, goingCount: 2, capacity: 10 });
    fixture.detectChanges();
    await click();
    http.expectOne(NEXT_URL).flush({ status: 'GOING', goingCount: 3, capacity: 10 });
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(2000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success').textContent.trim()).toBe(
      "You're going to this event!",
    );
    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
  });

  it('cleans up the success timer when destroyed', async () => {
    load();
    await click();
    http.expectOne(URL).flush({ status: 'GOING', goingCount: 13, capacity: 30 });
    fixture.detectChanges();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(3000);
    http.expectNone(URL);
  });

  it('closes an unconfirmed dialog when the event changes without leaving either event', async () => {
    load('GOING');
    button().click();
    fixture.detectChanges();
    fixture.componentRef.setInput('event', { ...EVENT, id: 8 });
    fixture.detectChanges();
    await vi.runAllTimersAsync();
    await fixture.whenStable();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    http.expectNone(URL);
    http.expectOne(NEXT_URL).flush({ status: 'GOING', goingCount: 4, capacity: 10 });
    fixture.detectChanges();
    expect(count()).toBe('4 going');
    expect(button().disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
  });

  it('does not confirm or show success when the component is destroyed with a dialog open', async () => {
    load('GOING');
    button().click();
    fixture.detectChanges();
    fixture.destroy();
    await vi.runAllTimersAsync();
    await fixture.whenStable();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    http.expectNone(URL);
  });

  it('requests participation and shows loading without actions until GET completes', async () => {
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Loading participation',
    );
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('section').getAttribute('aria-busy')).toBe('true');
    load();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    expect(count()).toBe('12 going');
  });

  it.each([null, 'NOT_INTERESTED'] as const)('shows I want to go for status %s', async (status) => {
    load(status);
    expect(button().textContent.trim()).toBe('I want to go');
    expect(button().disabled).toBe(false);
  });

  it('shows Leave event, the going count and capacity for a GOING user', async () => {
    load('GOING', 12, 30);
    expect(button().textContent.trim()).toBe('Leave event');
    expect(count()).toBe('12 going');
    expect(fixture.nativeElement.querySelector('.capacity').textContent.trim()).toBe('30 places');
  });

  it('displays unlimited capacity from the participation response', async () => {
    load(null, 12, null);
    expect(fixture.nativeElement.querySelector('.capacity').textContent.trim()).toBe(
      'No capacity limit',
    );
  });

  it('provides a retry after GET failure and prevents repeated retry requests while loading', async () => {
    http.expectOne(URL).flush(null, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-error-state')).not.toBeNull();
    expect(button().textContent.trim()).toBe('Try again');
    await click();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    load('GOING');
    expect(button().textContent.trim()).toBe('Leave event');
    expect(fixture.nativeElement.querySelector('app-error-state')).toBeNull();
  });

  it('updates status, count and capacity from a successful PUT without manually incrementing', async () => {
    load('NOT_INTERESTED', 12, 30);
    await click();
    const request = http.expectOne(URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ status: 'GOING' });
    expect(button().disabled).toBe(true);
    expect(count()).toBe('12 going');
    request.flush({ status: 'GOING', goingCount: 20, capacity: 45 });
    fixture.detectChanges();
    expect(count()).toBe('20 going');
    expect(fixture.nativeElement.querySelector('.capacity').textContent.trim()).toBe('45 places');
    expect(button().textContent.trim()).toBe('Leave event');
    expect(button().disabled).toBe(false);
  });

  it.each([12, 1, 0])(
    'clears status and decrements count %s after successful DELETE without going negative',
    async (goingCount) => {
      load('GOING', goingCount);
      await click();
      const request = http.expectOne(URL);
      expect(request.request.method).toBe('DELETE');
      expect(count()).toBe(`${goingCount} going`);
      request.flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();
      expect(count()).toBe(`${Math.max(0, goingCount - 1)} going`);
      expect(button().textContent.trim()).toBe('I want to go');
      expect(button().disabled).toBe(false);
      http.expectNone(URL);
    },
  );

  it.each([null, 'GOING'] as const)(
    'prevents duplicate actions when the initial status is %s',
    async (status) => {
      load(status);
      await click();
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

  it('preserves status and count on EVENT_FULL and allows a successful retry', async () => {
    load(null, 12);
    await click();
    http.expectOne(URL).flush({ message: 'EVENT_FULL' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent.trim()).toBe(
      'This event is full',
    );
    expect(count()).toBe('12 going');
    expect(button().textContent.trim()).toBe('I want to go');
    expect(button().disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.success')).toBeNull();
    await click();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    http.expectOne(URL).flush({ status: 'GOING', goingCount: 15, capacity: 30 });
    fixture.detectChanges();
    expect(count()).toBe('15 going');
    expect(button().textContent.trim()).toBe('Leave event');
  });

  it.each([null, 'GOING'] as const)(
    'preserves participation and count on an action error for status %s',
    async (status) => {
      load(status, 12);
      await click();
      http.expectOne(URL).flush(null, { status: 503, statusText: 'Unavailable' });
      fixture.detectChanges();
      expect(count()).toBe('12 going');
      expect(button().textContent.trim()).toBe(status === 'GOING' ? 'Leave event' : 'I want to go');
      expect(button().disabled).toBe(false);
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
        'Please try again',
      );
      expect(fixture.nativeElement.querySelector('.success')).toBeNull();
      await click();
      const retry = http.expectOne(URL);
      expect(retry.request.method).toBe(status === 'GOING' ? 'DELETE' : 'PUT');
      retry.flush(status === 'GOING' ? null : { status: 'GOING', goingCount: 13, capacity: 30 });
      fixture.detectChanges();
      expect(count()).toBe(status === 'GOING' ? '11 going' : '13 going');
    },
  );

  it.each(['GET', 'PUT', 'DELETE'])(
    'cancels pending %s and resets state when the event ID changes',
    async (method) => {
      if (method !== 'GET') {
        load(method === 'DELETE' ? 'GOING' : null);
        await click();
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
      expect(button().textContent.trim()).toBe('Leave event');
      expect(() => oldRequest.flush({ status: null, goingCount: 99, capacity: 100 })).toThrow();
      expect(count()).toBe('4 going');
    },
  );

  it('clears the previous action error when a different event is displayed', async () => {
    load();
    await click();
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

  it('does not reload when the event object changes but its ID stays the same', async () => {
    load();
    fixture.componentRef.setInput('event', { ...EVENT, title: 'Updated title' });
    fixture.detectChanges();
    http.expectNone(URL);
    expect(count()).toBe('12 going');
  });

  it.each(['GET', 'PUT', 'DELETE'])(
    'cancels pending %s when the section is destroyed',
    async (method) => {
      if (method !== 'GET') {
        load(method === 'DELETE' ? 'GOING' : null);
        await click();
      }
      const request = http.expectOne(URL);
      fixture.destroy();
      expect(request.cancelled).toBe(true);
    },
  );
});
