import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, map, merge, switchMap, tap } from 'rxjs';
import { EventSummary, Page } from '../../core/models/event.model';
import { EventsService } from '../../core/services/events.service';
import { CategoryFilterComponent } from '../../shared/components/category-filter/category-filter.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import { DateRangeComponent } from './date-range/date-range.component';
import { DiscoverFilter, parseDiscoverFilter, toEventFilter } from './discover-filter';

type DiscoverState = 'loading' | 'loaded' | 'empty' | 'error';

interface PageRequest {
  filter: DiscoverFilter;
  page: number;
}

const SKELETON_CARD_COUNT = 3;
const PREFETCH_THRESHOLD = 0.6;

@Component({
  selector: 'app-discover-page',
  imports: [
    RouterLink,
    CategoryFilterComponent,
    DateRangeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    EventCardComponent,
    SkeletonCardComponent,
  ],
  templateUrl: './discover-page.component.html',
  styleUrl: './discover-page.component.scss',
})
export class DiscoverPageComponent {
  private readonly eventsService = inject(EventsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pageRequests = new Subject<PageRequest>();
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  protected readonly skeletons = Array.from({ length: SKELETON_CARD_COUNT });
  private readonly filter$ = this.route.queryParamMap.pipe(map(parseDiscoverFilter));

  protected readonly filter = toSignal(this.filter$, { requireSync: true });
  protected readonly state = signal<DiscoverState>('loading');
  protected readonly events = signal<EventSummary[]>([]);
  protected readonly loadingMore = signal(false);
  protected readonly prefetchIndex = computed(() =>
    Math.floor(this.events().length * PREFETCH_THRESHOLD),
  );
  protected readonly lastPage = signal(true);
  private loadedPage = 0;

  constructor() {
    // A filter change cancels any request still in flight, so a late page never lands in the new list.
    merge(this.filter$.pipe(map((filter) => ({ filter, page: 0 }))), this.pageRequests)
      .pipe(
        switchMap((request) => this.load(request)),
        takeUntilDestroyed(),
      )
      .subscribe();

    // The sentinel sits on the card at PREFETCH_THRESHOLD of the loaded list and moves after every page.
    // Observing it again makes the callback fire if it is already on screen.
    effect((onCleanup) => {
      const sentinel = this.sentinel()?.nativeElement;
      if (!sentinel) {
        return;
      }
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          this.loadMore();
        }
      });
      observer.observe(sentinel);
      onCleanup(() => observer.disconnect());
    });
  }

  protected updateFilter(changes: Partial<DiscoverFilter>): void {
    const queryParams = Object.fromEntries(
      Object.entries(changes).map(([name, value]) => [name, value ?? null]),
    );
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  protected clearFilters(): void {
    this.updateFilter({ category: undefined, from: undefined, to: undefined });
  }

  protected retry(): void {
    this.pageRequests.next({ filter: this.filter(), page: 0 });
  }

  private loadMore(): void {
    if (this.state() === 'loaded' && !this.loadingMore() && !this.lastPage()) {
      this.pageRequests.next({ filter: this.filter(), page: this.loadedPage + 1 });
    }
  }

  private load({ filter, page }: PageRequest) {
    if (page === 0) {
      this.state.set('loading');
      this.events.set([]);
      this.loadingMore.set(false);
    } else {
      this.loadingMore.set(true);
    }
    return this.eventsService.getEvents(toEventFilter(filter), page).pipe(
      tap((result) => this.showPage(result)),
      catchError(() => {
        this.state.set('error');
        this.loadingMore.set(false);
        return EMPTY;
      }),
    );
  }

  private showPage(result: Page<EventSummary>): void {
    this.events.update((events) => [...events, ...result.content]);
    this.loadedPage = result.page;
    this.lastPage.set(result.last);
    this.loadingMore.set(false);
    this.state.set(this.events().length ? 'loaded' : 'empty');
  }
}
