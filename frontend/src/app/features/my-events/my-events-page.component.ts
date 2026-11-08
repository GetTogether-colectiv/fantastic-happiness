import { Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, map, merge, switchMap, tap } from 'rxjs';
import { EventSummary } from '../../core/models/event.model';
import { ParticipationService } from '../../core/services/participation.service';
import { CompactEventCardComponent } from '../../shared/components/compact-event-card/compact-event-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import { groupByDay } from './group-by-day';

type MyEventsTab = 'upcoming' | 'past';
type MyEventsState = 'loading' | 'loaded' | 'empty' | 'error';

const SKELETON_ROW_COUNT = 3;

@Component({
  selector: 'app-my-events-page',
  imports: [
    RouterLink,
    CompactEventCardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonCardComponent,
  ],
  templateUrl: './my-events-page.component.html',
  styleUrl: './my-events-page.component.scss',
})
export class MyEventsPageComponent {
  private readonly participationService = inject(ParticipationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);
  private readonly retryRequests = new Subject<void>();
  private readonly tab$ = this.route.queryParamMap.pipe(
    map((params): MyEventsTab => (params.get('tab') === 'past' ? 'past' : 'upcoming')),
  );

  protected readonly tab = toSignal(this.tab$, { requireSync: true });
  protected readonly state = signal<MyEventsState>('loading');
  protected readonly events = signal<EventSummary[]>([]);
  protected readonly skeletons = Array.from({ length: SKELETON_ROW_COUNT });
  protected readonly days = computed(() => groupByDay(this.events(), this.locale));

  constructor() {
    // Runs when the page is entered (so Swipe changes show up), on every tab change and on retry.
    // switchMap cancels the previous request, so a late response never lands in the wrong tab.
    merge(this.tab$, this.retryRequests.pipe(map(() => this.tab())))
      .pipe(
        switchMap((tab) => this.load(tab)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected selectTab(tab: MyEventsTab): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'past' ? 'past' : null },
      queryParamsHandling: 'merge',
    });
  }

  protected goToSwipe(): void {
    this.router.navigate(['/swipe']);
  }

  protected retry(): void {
    this.retryRequests.next();
  }

  private load(tab: MyEventsTab) {
    this.state.set('loading');
    this.events.set([]);
    return this.participationService.getMyEvents(tab === 'past' ? 'PAST' : 'UPCOMING').pipe(
      tap((events) => {
        this.events.set(events);
        this.state.set(events.length ? 'loaded' : 'empty');
      }),
      catchError(() => {
        this.state.set('error');
        return EMPTY;
      }),
    );
  }
}
