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
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { EventSummary } from '../../core/models/event.model';
import { EventsService } from '../../core/services/events.service';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import {
  CITY_ZOOM,
  CLUJ_NAPOCA_CENTER,
  LocatedEvent,
  addOpenStreetMapTiles,
  createCategoryIcon,
  hasLocation,
  toLatLng,
} from '../../shared/map/map.utils';
import { MapEventCardComponent } from './map-event-card/map-event-card.component';

const MAP_PAGE_SIZE = 200;
const CLUSTER_RADIUS_PX = 25;
const FOCUS_ZOOM = 17;
const LOCATE_ZOOM = 15;
const USER_POSITION_RADIUS_PX = 8;
const SNACK_BAR_DURATION_MS = 3000;
const LOCATION_ERROR_MESSAGE = "We couldn't find your location.";

@Component({
  selector: 'app-map-page',
  imports: [MatIconModule, ErrorStateComponent, MapEventCardComponent],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
})
export class MapPageComponent implements AfterViewInit, OnDestroy {
  private readonly eventsService = inject(EventsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly focusedEventId = Number(
    inject(ActivatedRoute).snapshot.queryParamMap.get('focus'),
  );

  private map!: L.Map;
  private readonly markers = L.markerClusterGroup({ maxClusterRadius: CLUSTER_RADIUS_PX });
  private userPosition?: L.CircleMarker;

  protected readonly loadFailed = signal(false);
  protected readonly selectedEvent = signal<EventSummary | null>(null);
  protected readonly canLocate = 'geolocation' in navigator;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement().nativeElement).setView(CLUJ_NAPOCA_CENTER, CITY_ZOOM);
    addOpenStreetMapTiles(this.map);
    this.markers.addTo(this.map);
    this.map.on('click', () => this.selectedEvent.set(null));
    this.map.on('locationfound', (location) => this.showUserPosition(location.latlng));
    this.map.on('locationerror', () => this.showLocationError());
    this.loadEvents();
  }

  // Leaflet keeps its own listeners and DOM, so it has to be cleaned up by hand.
  ngOnDestroy(): void {
    this.map.remove();
  }

  protected loadEvents(): void {
    this.loadFailed.set(false);
    this.eventsService
      .getEvents({}, 0, MAP_PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.showEvents(page.content),
        error: () => this.loadFailed.set(true),
      });
  }

  protected locateUser(): void {
    this.map.locate({ setView: true, maxZoom: LOCATE_ZOOM });
  }

  private showEvents(events: EventSummary[]): void {
    this.markers.clearLayers();
    this.markers.addLayers(events.filter(hasLocation).map((event) => this.createMarker(event)));
    this.focusRequestedEvent(events);
  }

  private createMarker(event: LocatedEvent): L.Marker {
    return L.marker(toLatLng(event), {
      icon: createCategoryIcon(event.category),
      title: event.title,
    }).on('click', () => this.selectedEvent.set(event));
  }

  private focusRequestedEvent(upcomingEvents: EventSummary[]): void {
    if (!this.focusedEventId) {
      return;
    }
    const upcomingEvent = upcomingEvents.find((event) => event.id === this.focusedEventId);
    if (upcomingEvent) {
      this.focusOn(upcomingEvent);
      return;
    }
    this.eventsService
      .getEvent(this.focusedEventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pastEvent) => {
        if (hasLocation(pastEvent)) {
          this.markers.addLayer(this.createMarker(pastEvent));
        }
        this.focusOn(pastEvent);
      });
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
