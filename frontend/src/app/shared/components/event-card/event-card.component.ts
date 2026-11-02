import { Component, input } from '@angular/core';
import { EventSummary } from '../../../core/models/event.model';
import { EventDatePipe } from '../../pipes/event-date.pipe';
import { CategoryChipComponent } from '../category-chip/category-chip.component';

@Component({
  selector: 'app-event-card',
  imports: [CategoryChipComponent, EventDatePipe],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss',
})
export class EventCardComponent {
  readonly event = input.required<EventSummary>();
}
