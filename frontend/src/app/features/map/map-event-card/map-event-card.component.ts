import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { EventSummary } from '../../../core/models/event.model';
import { EventDatePipe } from '../../../shared/pipes/event-date.pipe';
import { EventImagePipe } from '../../../shared/pipes/event-image.pipe';

@Component({
  selector: 'app-map-event-card',
  imports: [MatIconModule, RouterLink, EventDatePipe, EventImagePipe],
  templateUrl: './map-event-card.component.html',
  styleUrl: './map-event-card.component.scss',
})
export class MapEventCardComponent {
  readonly event = input.required<EventSummary>();
  readonly closed = output<void>();
}
