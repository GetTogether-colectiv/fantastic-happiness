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
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { EventSummary } from '../../core/models/event.model';
import { EventsService } from '../../core/services/events.service';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import {
  CITY_ZOOM,
  CLUJ_NAPOCA_CENTER,
  addOpenStreetMapTiles,
  createCategoryIcon,
  hasLocation,
  toLatLng,
} from '../../shared/map/map.utils';

const MAP_PAGE_SIZE = 200;
const CLUSTER_RADIUS_PX = 25;

@Component({
  selector: 'app-map-page',
  imports: [ErrorStateComponent],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
})
export class MapPageComponent implements AfterViewInit, OnDestroy {
  private readonly eventsService = inject(EventsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('map');

  private map?: L.Map;
  private readonly markers = L.markerClusterGroup({ maxClusterRadius: CLUSTER_RADIUS_PX });

  protected readonly loadFailed = signal(false);

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement().nativeElement).setView(CLUJ_NAPOCA_CENTER, CITY_ZOOM);
    addOpenStreetMapTiles(this.map);
    this.markers.addTo(this.map);
    this.loadEvents();
  }

  // Leaflet keeps its own listeners and DOM, so it has to be cleaned up by hand.
  ngOnDestroy(): void {
    this.map?.remove();
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

  private showEvents(events: EventSummary[]): void {
    const markers = events
      .filter(hasLocation)
      .map((event) =>
        L.marker(toLatLng(event), { icon: createCategoryIcon(event.category), title: event.title }),
      );
    this.markers.clearLayers();
    this.markers.addLayers(markers);
  }
}
