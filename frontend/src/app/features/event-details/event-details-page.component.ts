import { DatePipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { EventDetails } from '../../core/models/event.model';
import { User } from '../../core/models/user.model';
import { EventsService } from '../../core/services/events.service';
import { UsersService } from '../../core/services/users.service';
import { CategoryChipComponent } from '../../shared/components/category-chip/category-chip.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';

type DetailsState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'loaded'; event: EventDetails; organizer: User | null };

@Component({
  selector: 'app-event-details-page',
  imports: [CategoryChipComponent, DatePipe, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './event-details-page.component.html',
  styleUrl: './event-details-page.component.scss',
})
export class EventDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly events = inject(EventsService);
  private readonly users = inject(UsersService);
  private readonly retryCount = signal(0);

  protected readonly state = toSignal(
    combineLatest([
      this.route.paramMap.pipe(
        map((params) => params.get('id')),
        distinctUntilChanged(),
      ),
      toObservable(this.retryCount),
    ]).pipe(
      switchMap(([rawId]) => {
        const id = Number(rawId);
        if (!Number.isSafeInteger(id) || id <= 0) {
          return of<DetailsState>({ status: 'not-found' });
        }
        return this.events.getEvent(id).pipe(
          switchMap((event) =>
            this.users.getUser(event.organizerId).pipe(
              map((organizer): DetailsState => ({
                status: 'loaded',
                event,
                organizer,
              })),
              catchError(() => of<DetailsState>({ status: 'loaded', event, organizer: null })),
            ),
          ),
          catchError((error: unknown) =>
            of<DetailsState>({
              status:
                error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
            }),
          ),
          startWith<DetailsState>({ status: 'loading' }),
        );
      }),
    ),
    { initialValue: { status: 'loading' } as DetailsState },
  );

  protected retry(): void {
    this.retryCount.update((count) => count + 1);
  }

  protected goToDiscover(): void {
    void this.router.navigate(['/discover']);
  }

  protected goBack(): void {
    const state = this.location.getState() as { navigationId?: number } | null;
    if ((state?.navigationId ?? 0) > 1) {
      this.location.back();
    } else {
      this.goToDiscover();
    }
  }
}
