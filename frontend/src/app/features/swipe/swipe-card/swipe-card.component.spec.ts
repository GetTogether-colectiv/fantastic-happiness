import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventSummary } from '../../../core/models/event.model';
import { ParticipationStatus } from '../../../core/models/participation.model';
import { SwipeCardComponent } from './swipe-card.component';

const EVENT: EventSummary = {
  id: 7,
  title: 'Evening concert',
  category: 'MUSIC',
  startsAt: '2026-11-10T18:00:00Z',
  endsAt: '2026-11-10T20:00:00Z',
  city: 'Cluj-Napoca',
  locationName: 'Central Park',
  imageUrl: '/concert.jpg',
  latitude: null,
  longitude: null,
  capacity: 30,
  goingCount: 12,
};

describe('SwipeCardComponent', () => {
  let fixture: ComponentFixture<SwipeCardComponent>;
  let card: HTMLAnchorElement;
  const decide = vi.fn<(status: ParticipationStatus) => void>();
  const open = vi.fn<() => void>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    fixture = TestBed.createComponent(SwipeCardComponent);
    fixture.componentRef.setInput('event', EVENT);
    fixture.detectChanges();
    card = fixture.nativeElement.querySelector('.card');
    card.setPointerCapture = vi.fn();
    card.hasPointerCapture = vi.fn().mockReturnValue(true);
    card.releasePointerCapture = vi.fn();
    vi.spyOn(
      fixture.nativeElement.querySelector('.container'),
      'getBoundingClientRect',
    ).mockReturnValue({ width: 300 } as DOMRect);
    decide.mockReset();
    open.mockReset();
    fixture.componentInstance.decide.subscribe(decide);
    fixture.componentInstance.openDetails.subscribe(open);
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function pointer(type: string, x: number, options: Partial<PointerEvent> = {}): void {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      pointerId: 1,
      clientX: x,
      clientY: 0,
      button: 0,
      isPrimary: true,
      pointerType: 'mouse',
      ...options,
    });
    card.dispatchEvent(event);
    fixture.detectChanges();
  }

  it('renders all card information', () => {
    expect(card.textContent).toContain(EVENT.title);
    expect(card.textContent).toContain('Central Park, Cluj-Napoca');
    expect(card.textContent).toContain('12 going');
    expect(card.textContent).toContain('Music');
    expect(card.querySelector('img')?.getAttribute('src')).toBe('/concert.jpg');
    expect(card.querySelector('.date')?.textContent).toContain('10 Nov');
  });

  it.each(['mouse', 'touch'])(
    'captures %s drags and applies the transform and green stamp',
    (pointerType) => {
      pointer('pointerdown', 0, { pointerType });
      pointer('pointermove', 60);
      expect(card.setPointerCapture).toHaveBeenCalledWith(1);
      expect(card.style.transform).toBe('translateX(60px) rotate(3deg)');
      expect((card.querySelector('.going') as HTMLElement).style.opacity).toBe('0.6');
      expect((card.querySelector('.nope') as HTMLElement).style.opacity).toBe('0');
      pointer('pointermove', 90);
      expect((card.querySelector('.going') as HTMLElement).style.opacity).toBe('0.9');
    },
  );

  it.each([
    [101, 'GOING'],
    [-101, 'NOT_INTERESTED'],
  ] as const)('accepts displacement %s as %s', (dx, status) => {
    pointer('pointerdown', 0);
    pointer('pointermove', dx);
    if (dx < 0) {
      expect((card.querySelector('.nope') as HTMLElement).style.opacity).toBe('1');
    }
    pointer('pointerup', dx);
    expect(decide).toHaveBeenCalledExactlyOnceWith(status);
    expect(card.releasePointerCapture).toHaveBeenCalledWith(1);
    card.click();
    expect(open).not.toHaveBeenCalled();
  });

  it.each([40, 100, -100])('snaps back without submitting at displacement %s', (dx) => {
    pointer('pointerdown', 0);
    pointer('pointermove', dx);
    pointer('pointerup', dx);
    expect(decide).not.toHaveBeenCalled();
    expect(card.style.transform).toBe('translateX(0px) rotate(0deg)');
    expect(card.classList.contains('dragging')).toBe(false);
    card.click();
    expect(open).not.toHaveBeenCalled();
  });

  it('opens details for a tap and keyboard activation, but not a drag returning to its start', () => {
    pointer('pointerdown', 20);
    pointer('pointerup', 22);
    card.click();
    expect(open).toHaveBeenCalledTimes(1);
    pointer('pointerdown', 0);
    pointer('pointermove', 60);
    pointer('pointerup', 0);
    card.click();
    expect(open).toHaveBeenCalledTimes(1);
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(open).toHaveBeenCalledTimes(3);
  });

  it.each(['pointercancel', 'lostpointercapture'])('safely returns on %s', (type) => {
    pointer('pointerdown', 0);
    pointer('pointermove', 150);
    pointer(type, 150);
    pointer('pointerup', 150);
    expect(decide).not.toHaveBeenCalled();
    expect(card.style.transform).toBe('translateX(0px) rotate(0deg)');
  });

  it('ignores unrelated pointers and disables actions while busy', () => {
    pointer('pointerdown', 0);
    pointer('pointermove', 150, { pointerId: 2 });
    expect(card.style.transform).toBe('translateX(0px) rotate(0deg)');
    pointer('pointercancel', 0);
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    pointer('pointerdown', 0);
    pointer('pointerup', 150);
    card.click();
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(decide).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('reports exit completion once and restores the card when a decision is cleared', () => {
    const exited = vi.fn();
    fixture.componentInstance.exited.subscribe(exited);
    fixture.componentRef.setInput('decision', 'GOING');
    fixture.detectChanges();
    const event = new Event('transitionend', { bubbles: true });
    Object.assign(event, { propertyName: 'transform' });
    card.dispatchEvent(event);
    vi.runAllTimers();
    expect(exited).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('decision', null);
    fixture.detectChanges();
    expect(card.style.transform).toBe('translateX(0px) rotate(0deg)');
  });

  it.each([
    [150, 'GOING'],
    [-150, 'NOT_INTERESTED'],
  ] as const)(
    'cancels a rejected exit and accepts displacement %s as %s afterward',
    (dx, status) => {
      const exited = vi.fn();
      fixture.componentInstance.exited.subscribe(exited);
      pointer('pointerdown', 0);
      pointer('pointermove', 150);
      pointer('pointerup', 150);
      fixture.componentRef.setInput('busy', true);
      fixture.componentRef.setInput('decision', 'GOING');
      fixture.detectChanges();

      // The parent clears these inputs when the request fails before the exit finishes.
      fixture.componentRef.setInput('decision', null);
      fixture.componentRef.setInput('busy', false);
      fixture.detectChanges();
      expect(card.style.transform).toBe('translateX(0px) rotate(0deg)');
      const transition = new Event('transitionend', { bubbles: true });
      Object.assign(transition, { propertyName: 'transform' });
      card.dispatchEvent(transition);
      vi.runAllTimers();
      expect(exited).not.toHaveBeenCalled();

      pointer('pointerdown', 0);
      pointer('pointermove', dx);
      pointer('pointerup', dx);
      expect(decide).toHaveBeenNthCalledWith(1, 'GOING');
      expect(decide).toHaveBeenNthCalledWith(2, status);
      expect(decide).toHaveBeenCalledTimes(2);
    },
  );

  it('completes reduced-motion exits without waiting for a transition event', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const exited = vi.fn();
    fixture.componentInstance.exited.subscribe(exited);
    fixture.componentRef.setInput('decision', 'NOT_INTERESTED');
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    expect(exited).toHaveBeenCalledOnce();
  });
});
