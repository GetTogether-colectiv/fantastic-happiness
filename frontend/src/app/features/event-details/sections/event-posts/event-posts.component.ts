import { Component, input } from '@angular/core';
import { EventDetails } from '../../../../core/models/event.model';

@Component({
  selector: 'app-event-posts',
  template: '',
})
export class EventPostsComponent {
  readonly event = input.required<EventDetails>();
}
