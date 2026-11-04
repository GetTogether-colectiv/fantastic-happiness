import { Component, input } from '@angular/core';
import { EventDetails } from '../../../../core/models/event.model';

@Component({
  selector: 'app-event-map',
  template: '',
})
export class EventMapComponent {
  readonly event = input.required<EventDetails>();
}
