import { Component, ElementRef, computed, effect, inject, input, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { EventDetails } from '../../../../core/models/event.model';
import {
  LocatedEvent,
  addOpenStreetMapTiles,
  createCategoryIcon,
  hasLocation,
  toLatLng,
} from '../../../../shared/map/map.utils';

const DETAILS_ZOOM = 15;

const STATIC_MAP_OPTIONS: L.MapOptions = {
  dragging: false,
  zoomControl: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  touchZoom: false,
  boxZoom: false,
  keyboard: false,
};

@Component({
  selector: 'app-event-map',
  imports: [MatIconModule, RouterLink],
  templateUrl: './event-map.component.html',
  styleUrl: './event-map.component.scss',
})
export class EventMapComponent {
  private readonly router = inject(Router);
  private readonly mapElement = viewChild<ElementRef<HTMLElement>>('map');

  readonly event = input.required<EventDetails>();

  protected readonly located = computed(() => hasLocation(this.event()));

  constructor() {
    effect((onCleanup) => {
      const element = this.mapElement()?.nativeElement;
      const event = this.event();
      if (!element || !hasLocation(event)) {
        return;
      }
      const map = this.createMap(element, event);
      onCleanup(() => map.remove());
    });
  }

  private createMap(element: HTMLElement, event: LocatedEvent): L.Map {
    const position = toLatLng(event);
    const map = L.map(element, STATIC_MAP_OPTIONS).setView(position, DETAILS_ZOOM);
    addOpenStreetMapTiles(map);
    L.marker(position, { icon: createCategoryIcon(event.category), interactive: false }).addTo(map);
    map.on('click', () => this.openFullMap());
    return map;
  }

  private openFullMap(): void {
    void this.router.navigate(['/map'], { queryParams: { focus: this.event().id } });
  }
}
