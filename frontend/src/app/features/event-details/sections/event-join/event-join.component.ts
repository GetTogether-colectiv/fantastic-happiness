import { Component, input } from '@angular/core';
import { EventDetails } from '../../../../core/models/event.model';

@Component({
  selector: 'app-event-join',
  template: '',
})
export class EventJoinComponent {
  readonly event = input.required<EventDetails>();
}
