import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { EMPTY, Observable, Subject, catchError, debounceTime, switchMap, tap } from 'rxjs';
import { EventCategory, EventSummary, Page } from '../../core/models/event.model';
import { EventsService } from '../../core/services/events.service';
import { CategoryFilterComponent } from '../../shared/components/category-filter/category-filter.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import {
  CITY_ZOOM,
  CLUJ_NAPOCA_CENTER,
  LocatedEvent,
  addOpenStreetMapTiles,
  createCategoryIcon,
  hasLocation,
  toLatLng,
  toMapArea,
} from '../../shared/map/map.utils';
import { MapEventCardComponent } from './map-event-card/map-event-card.component';

const CLUSTER_RADIUS_PX = 25;
const AREA_PADDING = 0.25;
const RELOAD_DELAY_MS = 300;
const FOCUS_ZOOM = 17;
const LOCATE_ZOOM = 15;
const USER_POSITION_RADIUS_PX = 8;
const SNACK_BAR_DURATION_MS = 3000;
const LOCATION_ERROR_MESSAGE = "We couldn't find your location.";

@Component({
  selector: 'app-map-page',
  imports: [
    MatIconModule,
    RouterLink,
    CategoryFilterComponent,
    ErrorStateComponent,
    MapEventCardComponent,
  ],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
})
export class MapPageComponent implements AfterViewInit, OnDestroy {
  private readonly eventsService = inject(EventsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly areaRequests = new Subject<void>();

  private map!: L.Map;
  private readonly markers = L.markerClusterGroup({ maxClusterRadius: CLUSTER_RADIUS_PX });
  private userPosition?: L.CircleMarker;

  protected readonly loadFailed = signal(false);
  protected readonly tooManyEvents = signal(false);
  protected readonly focusedEventId = signal<number | null>(null);
  protected readonly selectedCategory = signal<EventCategory | undefined>(undefined);
  protected readonly selectedEvent = signal<EventSummary | null>(null);
  protected readonly canLocate = 'geolocation' in navigator;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement().nativeElement).setView(CLUJ_NAPOCA_CENTER, CITY_ZOOM);
    addOpenStreetMapTiles(this.map);
    this.markers.addTo(this.map);
    this.map.on('click', () => this.selectedEvent.set(null));
    this.map.on('moveend', () => this.reloadArea());
    this.map.on('locationfound', (location) => this.showUserPosition(location.latlng));
    this.map.on('locationerror', () => this.showLocationError());

    this.areaRequests
      .pipe(
        debounceTime(RELOAD_DELAY_MS),
        switchMap(() => this.loadVisibleArea()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.focusedEventId.set(Number(params.get('focus')) || null);
      this.showFocusedEventOrAll();
    });
  }

  // Leaflet keeps its own listeners and DOM, so it has to be cleaned up by hand.
  ngOnDestroy(): void {
    this.map.remove();
  }

  protected backToEvent(eventId: number): void {
    const state = this.location.getState() as { navigationId?: number } | null;
    if ((state?.navigationId ?? 0) > 1) {
      this.location.back();
    } else {
      void this.router.navigate(['/events', eventId], { replaceUrl: true });
    }
  }

  protected reloadArea(): void {
    if (!this.focusedEventId()) {
      this.areaRequests.next();
    }
  }

  protected locateUser(): void {
    this.map.locate({ setView: true, maxZoom: LOCATE_ZOOM });
  }

  protected filterByCategory(category: EventCategory | undefined): void {
    this.selectedCategory.set(category);
    const selectedEvent = this.selectedEvent();
    if (category && selectedEvent && selectedEvent.category !== category) {
      this.selectedEvent.set(null);
    }
    this.reloadArea();
  }

  private showFocusedEventOrAll(): void {
    const focusedEventId = this.focusedEventId();
    if (focusedEventId) {
      this.showOnlyEvent(focusedEventId);
      return;
    }
    this.selectedEvent.set(null);
    this.map.setView(CLUJ_NAPOCA_CENTER, CITY_ZOOM);
    this.reloadArea();
  }

  private showOnlyEvent(id: number): void {
    this.tooManyEvents.set(false);
    this.markers.clearLayers();
    this.eventsService
      .getEvent(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (this.focusedEventId() === event.id) {
          this.showMarkers([event]);
          this.focusOn(event);
        }
      });
  }

  private loadVisibleArea(): Observable<Page<EventSummary>> {
    const area = toMapArea(this.map.getBounds().pad(AREA_PADDING));
    return this.eventsService.getEventsInArea(area, this.selectedCategory()).pipe(
      tap((page) => this.showAreaEvents(page)),
      catchError(() => {
        this.loadFailed.set(true);
        return EMPTY;
      }),
    );
  }

  private showAreaEvents(page: Page<EventSummary>): void {
    if (this.focusedEventId()) {
      return;
    }
    this.loadFailed.set(false);
    this.tooManyEvents.set(!page.last);
    this.showMarkers(page.content);
  }

  private showMarkers(events: EventSummary[]): void {
    this.markers.clearLayers();
    this.markers.addLayers(events.filter(hasLocation).map((event) => this.createMarker(event)));
  }

  private createMarker(event: LocatedEvent): L.Marker {
    return L.marker(toLatLng(event), {
      icon: createCategoryIcon(event.category),
      title: event.title,
    }).on('click', () => this.selectedEvent.set(event));
  }

  private focusOn(event: EventSummary): void {
    this.selectedEvent.set(event);
    if (hasLocation(event)) {
      this.map.setView(toLatLng(event), FOCUS_ZOOM);
    }
  }

  private showUserPosition(position: L.LatLng): void {
    this.userPosition?.remove();
    this.userPosition = L.circleMarker(position, {
      className: 'user-position',
      radius: USER_POSITION_RADIUS_PX,
    }).addTo(this.map);
  }

  private showLocationError(): void {
    this.snackBar.open(LOCATION_ERROR_MESSAGE, undefined, {
      duration: SNACK_BAR_DURATION_MS,
      panelClass: 'app-snack-bar',
    });
  }
}
