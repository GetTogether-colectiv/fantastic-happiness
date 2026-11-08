import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { CATEGORY_ICONS, EventSummary } from '../../../core/models/event.model';

@Component({
  selector: 'app-compact-event-card',
  imports: [DatePipe, MatIcon],
  templateUrl: './compact-event-card.component.html',
  styleUrl: './compact-event-card.component.scss',
})
export class CompactEventCardComponent {
  readonly event = input.required<EventSummary>();
  readonly showDate = input(false);

  protected readonly icons = CATEGORY_ICONS;
}
