import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EventSummary } from '../../core/models/event.model';
import { ParticipationStatus } from '../../core/models/participation.model';
import { ParticipationService } from '../../core/services/participation.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import { EventImagePipe } from '../../shared/pipes/event-image.pipe';
import { SwipeCardComponent } from './swipe-card/swipe-card.component';

const REFILL_THRESHOLD = 3;

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select') !== null)
  );
}

@Component({
  selector: 'app-swipe-page',
  imports: [
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonCardComponent,
    SwipeCardComponent,
    EventImagePipe,
  ],
  templateUrl: './swipe-page.component.html',
  styleUrl: './swipe-page.component.scss',
  host: {
    '(document:keydown.arrowright)': 'decideWithKeyboard($event, "GOING")',
    '(document:keydown.arrowleft)': 'decideWithKeyboard($event, "NOT_INTERESTED")',
  },
})
export class SwipePageComponent {
  private readonly participation = inject(ParticipationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly decidedIds = new Set<number>();
  protected readonly events = signal<EventSummary[]>([]);
  protected readonly currentEvents = computed(() => this.events().slice(0, 1));
  protected readonly loading = signal(false);
  protected readonly feedError = signal(false);
  protected readonly message = signal('');
  protected readonly busy = signal(false);
  protected readonly decision = signal<ParticipationStatus | null>(null);
  private requestSucceeded = false;
  private animationFinished = false;

  constructor() {
    this.loadFeed();
  }

  protected loadFeed(): void {
    if (this.loading() || this.busy()) {
      return;
    }
    this.loading.set(true);
    this.feedError.set(false);
    this.participation
      .getFeed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (incoming) => {
          this.events.update((events) => {
            const ids = new Set([...events.map((event) => event.id), ...this.decidedIds]);
            const additions = incoming.filter((event) => {
              if (ids.has(event.id)) {
                return false;
              }
              ids.add(event.id);
              return true;
            });
            return [...events, ...additions];
          });
          this.loading.set(false);
          // Refill only after another decision or an explicit retry, avoiding duplicate-only loops.
        },
        error: () => {
          this.loading.set(false);
          this.feedError.set(true);
        },
      });
  }

  protected decide(status: ParticipationStatus): void {
    const event = this.events()[0];
    if (!event || this.busy()) {
      return;
    }
    this.message.set('');
    this.requestSucceeded = false;
    this.animationFinished = false;
    this.busy.set(true);
    this.decision.set(status);
    this.participation
      .setStatus(event.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.requestSucceeded = true;
          this.advance();
        },
        error: (error: unknown) => {
          this.message.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'This event is full'
              : "Couldn't save your choice. Please try again.",
          );
          this.decision.set(null);
          this.busy.set(false);
        },
      });
  }

  protected decideWithKeyboard(event: Event, status: ParticipationStatus): void {
    if (!this.events().length || isTypingTarget(event.target)) {
      return;
    }
    event.preventDefault();
    this.decide(status);
  }

  protected exited(): void {
    if (this.busy()) {
      this.animationFinished = true;
      this.advance();
    }
  }

  protected openEvent(eventId: number): void {
    if (!this.busy()) {
      void this.router.navigate(['/events', eventId]);
    }
  }

  protected goToDiscover(): void {
    void this.router.navigate(['/discover']);
  }

  private advance(): void {
    if (!this.requestSucceeded || !this.animationFinished) {
      return;
    }
    this.decidedIds.add(this.events()[0].id);
    this.events.update((events) => events.slice(1));
    this.decision.set(null);
    this.busy.set(false);
    if (this.events().length < REFILL_THRESHOLD) {
      this.loadFeed();
    }
  }
}
