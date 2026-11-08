import { Component, effect, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { EventDetails } from '../../../../core/models/event.model';
import { ChatService } from '../../../../core/services/chat.service';
import { JOIN_TO_CHAT_MESSAGE } from '../../../../core/models/chat.model';

@Component({
  selector: 'app-event-chat',
  imports: [MatIconModule, RouterLink],
  templateUrl: './event-chat.component.html',
  styleUrl: './event-chat.component.scss',
})

export class EventChatComponent {
  readonly event = input.required<EventDetails>();
  private readonly chat = inject(ChatService);
  private request = Subscription.EMPTY;

  protected readonly messageCount = signal<number | null>(null);
  protected readonly joinToChatMessage = JOIN_TO_CHAT_MESSAGE;

  constructor() {
    effect((onCleanup) => {
      this.loadCount(this.event().id);
      onCleanup(() => this.request.unsubscribe());
    });
  }

  refresh(): void {
    this.loadCount(this.event().id);
  }

  private loadCount(eventId: number): void {
    this.request.unsubscribe();
    this.request = this.chat.getMessageCount(eventId).subscribe({
      next: (count) => this.messageCount.set(count),
      error: () => this.messageCount.set(null),
    });
  }
}
