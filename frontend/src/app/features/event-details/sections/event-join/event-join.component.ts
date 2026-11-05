import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Subscription, map } from 'rxjs';
import { EventDetails } from '../../../../core/models/event.model';
import { ParticipationResponse } from '../../../../core/models/participation.model';
import { ParticipationService } from '../../../../core/services/participation.service';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';

@Component({
  selector: 'app-event-join',
  imports: [ErrorStateComponent],
  templateUrl: './event-join.component.html',
  styleUrl: './event-join.component.scss',
})
export class EventJoinComponent {
  readonly event = input.required<EventDetails>();
  private readonly service = inject(ParticipationService);
  private readonly eventId = computed(() => this.event().id);
  private requests = new Subscription();
  protected readonly participation = signal<ParticipationResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly pending = signal(false);
  protected readonly message = signal('');

  constructor() {
    effect((onCleanup) => {
      const eventId = this.eventId();
      const requests = new Subscription();
      this.requests = requests;
      this.participation.set(null);
      this.pending.set(false);
      this.message.set('');
      this.loadParticipation(eventId);
      // Cancel both reads and actions when the event changes or the section is destroyed.
      onCleanup(() => requests.unsubscribe());
    });
  }

  protected retry(): void {
    if (!this.loading() && !this.pending()) {
      this.loadParticipation(this.eventId());
    }
  }

  private loadParticipation(eventId: number): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.requests.add(
      this.service.getParticipation(eventId).subscribe({
        next: (response) => {
          this.participation.set(response);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
        },
      }),
    );
  }

  protected toggleParticipation(): void {
    const current = this.participation();
    if (!current || this.loading() || this.pending()) {
      return;
    }
    const eventId = this.eventId();
    const request =
      current.status === 'GOING'
        ? this.service.removeParticipation(eventId).pipe(
            map((): ParticipationResponse => ({
              ...current,
              status: null,
              goingCount: Math.max(0, current.goingCount - 1),
            })),
          )
        : this.service.setStatus(eventId, 'GOING');
    this.pending.set(true);
    this.message.set('');
    this.requests.add(
      request.subscribe({
        next: (response) => {
          this.participation.set(response);
          this.pending.set(false);
        },
        error: (error: unknown) => {
          this.message.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'This event is full'
              : "Couldn't update your participation. Please try again.",
          );
          this.pending.set(false);
        },
      }),
    );
  }
}
