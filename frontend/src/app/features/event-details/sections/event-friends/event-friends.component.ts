import { Component, input } from '@angular/core';
import { EventDetails } from '../../../../core/models/event.model';

@Component({
  selector: 'app-event-friends',
  template: '',
})
export class EventFriendsComponent {
  readonly event = input.required<EventDetails>();
}
