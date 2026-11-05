import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { EventSummary } from '../../../core/models/event.model';
import { ParticipationStatus } from '../../../core/models/participation.model';
import { CategoryChipComponent } from '../../../shared/components/category-chip/category-chip.component';
import { EventDatePipe } from '../../../shared/pipes/event-date.pipe';

const DRAG_THRESHOLD_PX = 5;
const ROTATION_DIVISOR = 20;
const SWIPE_WIDTH_FRACTION = 1 / 3;
const ANIMATION_MS = 220;
const TRANSITION_FALLBACK_MS = 50;

@Component({
  selector: 'app-swipe-card',
  imports: [CategoryChipComponent, EventDatePipe],
  templateUrl: './swipe-card.component.html',
  styleUrl: './swipe-card.component.scss',
})
export class SwipeCardComponent {
  readonly event = input.required<EventSummary>();
  readonly busy = input(false);
  readonly decision = input<ParticipationStatus | null>(null);
  readonly decide = output<ParticipationStatus>();
  readonly exited = output<void>();
  readonly openDetails = output<void>();
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');
  protected readonly dx = signal(0);
  protected readonly dragging = signal(false);
  protected readonly width = signal(1);
  protected readonly duration = ANIMATION_MS;
  protected readonly offset = computed(() =>
    this.decision()
      ? (this.decision() === 'GOING' ? 1 : -1) * (window.innerWidth + this.width())
      : this.dx(),
  );
  protected readonly transform = computed(
    () => `translateX(${this.offset()}px) rotate(${this.offset() / ROTATION_DIVISOR}deg)`,
  );
  protected readonly stampOpacity = computed(() =>
    Math.min(Math.abs(this.offset()) / (this.width() * SWIPE_WIDTH_FRACTION), 1),
  );
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private suppressClick = false;
  private exitReported = false;

  constructor() {
    effect((onCleanup) => {
      const decision = this.decision();
      this.exitReported = false;
      this.dragging.set(false);
      this.dx.set(0);
      if (decision) {
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        // Also complete when no transition event fires (including reduced-motion mode).
        const timer = setTimeout(
          () => this.finishExit(),
          reducedMotion ? 0 : ANIMATION_MS + TRANSITION_FALLBACK_MS,
        );
        onCleanup(() => clearTimeout(timer));
      }
    });
  }

  protected pointerDown(event: PointerEvent): void {
    if (this.busy() || this.pointerId !== null || !event.isPrimary || event.button !== 0) {
      return;
    }
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.suppressClick = false;
    this.width.set(this.container().nativeElement.getBoundingClientRect().width || 1);
    this.dragging.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected pointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    this.dx.set(event.clientX - this.startX);
    if (Math.hypot(this.dx(), event.clientY - this.startY) > DRAG_THRESHOLD_PX) {
      this.suppressClick = true;
    }
  }

  protected pointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) {
      return;
    }
    this.pointerMove(event);
    const dx = this.dx();
    this.releasePointer(event);
    if (Math.abs(dx) > this.width() * SWIPE_WIDTH_FRACTION) {
      this.suppressClick = true;
      this.decide.emit(dx > 0 ? 'GOING' : 'NOT_INTERESTED');
    } else {
      this.dx.set(0);
    }
  }

  protected cancelPointer(event: PointerEvent): void {
    if (event.pointerId === this.pointerId) {
      this.suppressClick = true;
      this.releasePointer(event);
      this.dx.set(0);
    }
  }

  private releasePointer(event: PointerEvent): void {
    this.pointerId = null;
    this.dragging.set(false);
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  protected open(event: MouseEvent): void {
    event.preventDefault();
    if (!this.busy() && !this.suppressClick) {
      this.openDetails.emit();
    }
  }

  protected openWithKeyboard(event: Event): void {
    event.preventDefault();
    if (!this.busy()) {
      this.openDetails.emit();
    }
  }

  protected transitionEnd(event: TransitionEvent): void {
    if (event.target === event.currentTarget && event.propertyName === 'transform') {
      this.finishExit();
    }
  }

  private finishExit(): void {
    if (this.decision() && !this.exitReported) {
      this.exitReported = true;
      this.exited.emit();
    }
  }
}
