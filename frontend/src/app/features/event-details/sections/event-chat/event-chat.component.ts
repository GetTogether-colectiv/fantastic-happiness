import { Component, input } from '@angular/core';
import { EventDetails } from '../../../../core/models/event.model';

@Component({
  selector: 'app-event-chat',
  template: '',
})
export class EventChatComponent {
  readonly event = input.required<EventDetails>();
}
