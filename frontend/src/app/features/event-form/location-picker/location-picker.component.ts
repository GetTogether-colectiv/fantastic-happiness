import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  forwardRef,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';
import { Coordinates } from '../../../core/models/event.model';
import {
  CITY_ZOOM,
  CLUJ_NAPOCA_CENTER,
  addOpenStreetMapTiles,
  toCoordinates,
  toLatLng,
} from '../../../shared/map/map.utils';

const PICKED_ZOOM = 16;

@Component({
  selector: 'app-location-picker',
  imports: [MatIconModule],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocationPickerComponent),
      multi: true,
    },
  ],
})
export class LocationPickerComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  private readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly marker = L.marker(CLUJ_NAPOCA_CENTER, { draggable: true });
  private map?: L.Map;
  private onChange: (value: Coordinates | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  readonly picked = output<Coordinates>();

  protected readonly value = signal<Coordinates | null>(null);

  ngAfterViewInit(): void {
    this.map = L.map(this.mapElement().nativeElement).setView(CLUJ_NAPOCA_CENTER, CITY_ZOOM);
    addOpenStreetMapTiles(this.map);
    this.map.on('click', (event) => this.pick(event.latlng));
    this.marker.on('dragend', () => this.pick(this.marker.getLatLng()));
    this.showValue();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  writeValue(value: Coordinates | null): void {
    this.value.set(value);
    this.showValue();
  }

  registerOnChange(onChange: (value: Coordinates | null) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  protected clear(): void {
    this.value.set(null);
    this.marker.remove();
    this.onChange(null);
    this.onTouched();
  }

  private pick(position: L.LatLng): void {
    const value = toCoordinates(position);
    this.value.set(value);
    this.marker.setLatLng(position);
    this.map?.addLayer(this.marker);
    this.onChange(value);
    this.onTouched();
    this.picked.emit(value);
  }

  private showValue(): void {
    if (!this.map) {
      return;
    }
    const value = this.value();
    if (!value) {
      this.marker.remove();
      return;
    }
    this.marker.setLatLng(toLatLng(value)).addTo(this.map);
    this.map.setView(toLatLng(value), PICKED_ZOOM, { animate: false });
  }
}
