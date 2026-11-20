import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { EventSummary } from '../../core/models/event.model';
import { ParticipationResponse, ParticipationStatus } from '../../core/models/participation.model';
import { ParticipationService } from '../../core/services/participation.service';
import { SwipeCardComponent } from './swipe-card/swipe-card.component';
import { SwipePageComponent } from './swipe-page.component';

function event(id: number): EventSummary {
  return {
    id,
    title: `Event ${id}`,
    category: 'TECH',
    startsAt: '2026-11-10T18:00:00Z',
    endsAt: '2026-11-10T20:00:00Z',
    city: 'Cluj-Napoca',
    locationName: 'Park',
    imageUrl: null,
    latitude: null,
    longitude: null,
    capacity: 20,
    goingCount: 0,
  };
}

describe('SwipePageComponent', () => {
  let fixture: ComponentFixture<SwipePageComponent>;
  let feeds: Subject<EventSummary[]>[];
  let requests: Subject<ParticipationResponse>[];
  let service: { getFeed: ReturnType<typeof vi.fn>; setStatus: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    feeds = [];
    requests = [];
    service = {
      getFeed: vi.fn(() => {
        const response = new Subject<EventSummary[]>();
        feeds.push(response);
        return response;
      }),
      setStatus: vi.fn(() => {
        const response = new Subject<ParticipationResponse>();
        requests.push(response);
        return response;
      }),
    };
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ParticipationService, useValue: service },
        { provide: Router, useValue: router },
      ],
    });
    fixture = TestBed.createComponent(SwipePageComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  function card(): SwipeCardComponent {
    return fixture.debugElement.query(By.directive(SwipeCardComponent)).componentInstance;
  }

  function press(key: 'ArrowRight' | 'ArrowLeft'): void {
    fixture.nativeElement
      .querySelector('app-swipe-card .card')
      .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  }

  function load(ids: number[]): void {
    feeds[0].next(ids.map(event));
    fixture.detectChanges();
  }

  function start(status: ParticipationStatus = 'GOING'): SwipeCardComponent {
    const current = card();
    current.decide.emit(status);
    fixture.detectChanges();
    return current;
  }

  function succeed(current: SwipeCardComponent): void {
    requests.at(-1)!.next({ status: 'GOING', goingCount: 1, capacity: 20 });
    current.exited.emit();
    fixture.detectChanges();
  }

  it('loads initially and renders only the first card', () => {
    expect(fixture.nativeElement.textContent).not.toContain('No events');
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(service.getFeed).toHaveBeenCalledOnce();
    load([1, 2, 3, 4]);
    expect(fixture.nativeElement.querySelectorAll('app-swipe-card')).toHaveLength(1);
    expect(card().event().id).toBe(1);
  });

  it('waits for animation after an early API success', () => {
    load([1, 2, 3, 4]);
    const current = start();
    requests[0].next({ status: 'GOING', goingCount: 1, capacity: 20 });
    fixture.detectChanges();
    expect(card().event().id).toBe(1);
    current.exited.emit();
    fixture.detectChanges();
    expect(card().event().id).toBe(2);
    expect(service.getFeed).toHaveBeenCalledTimes(1);
  });

  it('waits for API success after an early animation and blocks repeated actions', () => {
    load([1, 2, 3]);
    const current = start();
    current.exited.emit();
    current.decide.emit('GOING');
    fixture.detectChanges();
    expect(card().event().id).toBe(1);
    expect(service.setStatus).toHaveBeenCalledTimes(1);
    expect(service.getFeed).toHaveBeenCalledTimes(1);
    expect(card().busy()).toBe(true);
    succeed(current);
    expect(card().event().id).toBe(2);
    expect(service.getFeed).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['ArrowRight', 'GOING'],
    ['ArrowLeft', 'NOT_INTERESTED'],
  ] as const)('uses the decision flow for the %s key', (key, status) => {
    load([1, 2, 3]);
    press(key);
    expect(service.setStatus).toHaveBeenCalledWith(1, status);
    expect(card().decision()).toBe(status);
  });

  it('decides with arrow keys pressed anywhere on the page, but not while typing', () => {
    load([1, 2, 3]);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(service.setStatus).not.toHaveBeenCalled();
    input.remove();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(service.setStatus).toHaveBeenCalledExactlyOnceWith(1, 'NOT_INTERESTED');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(service.setStatus).toHaveBeenCalledOnce();
  });

  it('navigates to details and blocks navigation during a submission', () => {
    load([7]);
    card().openDetails.emit();
    expect(router.navigate).toHaveBeenCalledWith(['/events', 7]);
    start();
    card().openDetails.emit();
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('restores a full card and displays the exact message', () => {
    load([1, 2]);
    const current = start();
    current.exited.emit();
    requests[0].error(new HttpErrorResponse({ status: 409 }));
    fixture.detectChanges();
    expect(card().event().id).toBe(1);
    expect(card().decision()).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent.trim()).toBe(
      'This event is full',
    );
    expect(card().busy()).toBe(false);
    expect(service.getFeed).toHaveBeenCalledTimes(1);
  });

  describe('EVENT_FULL recovery', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      fixture.destroy();
      vi.useRealTimers();
    });

    function cardElement(): HTMLAnchorElement {
      return fixture.nativeElement.querySelector('app-swipe-card .card');
    }

    function swipe(dx: number): void {
      const element = cardElement();
      element.setPointerCapture = vi.fn();
      element.hasPointerCapture = vi.fn().mockReturnValue(true);
      element.releasePointerCapture = vi.fn();
      vi.spyOn(
        fixture.nativeElement.querySelector('app-swipe-card .container'),
        'getBoundingClientRect',
      ).mockReturnValue({ width: 300 } as DOMRect);
      for (const [type, clientX] of [
        ['pointerdown', 0],
        ['pointermove', dx],
        ['pointerup', dx],
      ] as const) {
        const pointer = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(pointer, { pointerId: 1, clientX, clientY: 0, button: 0, isPrimary: true });
        element.dispatchEvent(pointer);
        fixture.detectChanges();
      }
    }

    function finishTransition(): void {
      const transition = new Event('transitionend', { bubbles: true });
      Object.assign(transition, { propertyName: 'transform' });
      cardElement().dispatchEvent(transition);
      fixture.detectChanges();
    }

    function rejectFull(): void {
      requests[0].error(new HttpErrorResponse({ status: 409, error: { message: 'EVENT_FULL' } }));
      fixture.detectChanges();
    }

    function expectRestored(): void {
      expect(card().event().id).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('app-swipe-card')).toHaveLength(1);
      expect(cardElement().querySelector('h2')?.textContent).toBe('Event 1');
      expect(fixture.nativeElement.textContent).not.toContain('Event 2');
      expect(cardElement().style.transform).toBe('translateX(0px) rotate(0deg)');
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent.trim()).toBe(
        'This event is full',
      );
      expect(card().busy()).toBe(false);
    }

    it.each([
      ['right swipe', 'before'],
      ['right swipe', 'after'],
      ['right arrow key', 'before'],
      ['right arrow key', 'after'],
    ] as const)(
      'restores the same card when %s receives 409 %s exit completion',
      (trigger, timing) => {
        load([1, 2, 3, 4]);
        const originalCard = card();
        if (trigger === 'right swipe') {
          swipe(150);
        } else {
          press('ArrowRight');
        }
        expect(service.setStatus).toHaveBeenCalledExactlyOnceWith(1, 'GOING');
        expect(cardElement().style.transform).not.toBe('translateX(0px) rotate(0deg)');
        if (timing === 'after') {
          finishTransition();
          expect(card().event().id).toBe(1);
        }

        rejectFull();
        expectRestored();
        expect(card()).toBe(originalCard);
        // A late transition or fallback timer must not advance the queue after rejection.
        finishTransition();
        vi.advanceTimersByTime(1000);
        fixture.detectChanges();
        expectRestored();
        expect(service.getFeed).toHaveBeenCalledTimes(1);
        expect(service.setStatus).toHaveBeenCalledTimes(1);
      },
    );

    it.each([
      ['GOING', 'before'],
      ['GOING', 'after'],
      ['NOT_INTERESTED', 'before'],
      ['NOT_INTERESTED', 'after'],
    ] as const)('allows %s after 409 received %s exit completion', (status, timing) => {
      load([1, 2, 3, 4]);
      swipe(150);
      if (timing === 'after') {
        finishTransition();
      }
      rejectFull();
      expectRestored();

      if (status === 'GOING') {
        press('ArrowRight');
      } else {
        swipe(-150);
      }
      expect(service.setStatus).toHaveBeenNthCalledWith(2, 1, status);
      expect(service.setStatus).toHaveBeenCalledTimes(2);
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      requests[1].next({ status, goingCount: status === 'GOING' ? 1 : 0, capacity: 20 });
      fixture.detectChanges();
      expect(card().event().id).toBe(1);
      finishTransition();
      expect(card().event().id).toBe(2);
      expect(fixture.nativeElement.querySelectorAll('app-swipe-card')).toHaveLength(1);
      expect(service.getFeed).toHaveBeenCalledTimes(1);
    });
  });

  it('preserves the card and allows retry after other submission errors', () => {
    load([1, 2]);
    start();
    requests[0].error(new HttpErrorResponse({ status: 503 }));
    fixture.detectChanges();
    expect(card().event().id).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Please try again');
    start();
    expect(service.setStatus).toHaveBeenCalledTimes(2);
  });

  it('deduplicates queued, repeated and successfully swiped IDs in a refill', () => {
    load([1, 2, 3]);
    succeed(start());
    feeds[1].next([event(1), event(2), event(3), event(4), event(4)]);
    fixture.detectChanges();
    expect(card().event().id).toBe(2);
    succeed(start());
    expect(card().event().id).toBe(3);
    succeed(start());
    expect(card().event().id).toBe(4);
    expect(service.getFeed).toHaveBeenCalledTimes(3);
    succeed(start());
    expect(fixture.nativeElement.querySelector('app-swipe-card')).toBeNull();
    expect(service.getFeed).toHaveBeenCalledTimes(3);
  });

  it('does not loop when a small feed contains only queued duplicates', () => {
    load([1, 2, 3]);
    succeed(start());
    feeds[1].next([event(2), event(3)]);
    fixture.detectChanges();
    expect(service.getFeed).toHaveBeenCalledTimes(2);
    expect(card().event().id).toBe(2);
  });

  it('keeps queued cards when refilling fails and supports retry', () => {
    load([1, 2, 3]);
    succeed(start());
    feeds[1].error(new HttpErrorResponse({ status: 503 }));
    fixture.detectChanges();
    expect(card().event().id).toBe(2);
    fixture.nativeElement.querySelector('app-error-state button').click();
    fixture.detectChanges();
    expect(service.getFeed).toHaveBeenCalledTimes(3);
    expect(card().event().id).toBe(2);
  });

  it('shows the error state on initial failure and the empty state after a successful empty retry', () => {
    feeds[0].error(new HttpErrorResponse({ status: 503 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-error-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
    fixture.nativeElement.querySelector('app-error-state button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
    feeds[1].next([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-swipe-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-error-state')).toBeNull();
    expect(service.getFeed).toHaveBeenCalledTimes(2);
  });

  it('shows the exact empty-state message for an initial empty feed', () => {
    load([]);
    expect(fixture.nativeElement.querySelector('app-empty-state h2').textContent).toBe(
      "You're all caught up — check back later or browse Discover",
    );
    expect(fixture.nativeElement.querySelector('app-swipe-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.hint')).toBeNull();
  });

  it('hides the empty state during initial loading', () => {
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
  });

  it('waits for the final card and its refill before showing the empty state', () => {
    load([1]);
    const current = start();
    current.exited.emit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
    succeed(current);
    expect(fixture.nativeElement.querySelector('app-swipe-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();

    feeds[1].next([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('shows a feed error instead of an empty state when the final refill fails', () => {
    load([1]);
    succeed(start());
    feeds[1].error(new HttpErrorResponse({ status: 503 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-error-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
  });

  it('keeps remaining cards visible during and after an empty refill', () => {
    load([1, 2, 3]);
    succeed(start());
    expect(card().event().id).toBe(2);
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
    feeds[1].next([]);
    fixture.detectChanges();
    expect(card().event().id).toBe(2);
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
    expect(fixture.nativeElement.querySelector('.hint')).not.toBeNull();
  });

  it('navigates to Discover from the empty-state action', () => {
    load([]);
    const button = fixture.nativeElement.querySelector('app-empty-state button');
    expect(button.textContent.trim()).toBe('Browse Discover');
    button.click();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/discover']);
  });

  it('unsubscribes when leaving the page', () => {
    expect(feeds[0].observed).toBe(true);
    fixture.destroy();
    expect(feeds[0].observed).toBe(false);
  });
});
