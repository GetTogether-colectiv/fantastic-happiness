import { Location } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { ChatMessage } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { EventsService } from '../../core/services/events.service';

@Component({
  selector: 'app-chat-page',
  imports: [FormsModule, MatIconModule],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chat = inject(ChatService);
  private readonly events = inject(EventsService);
  private readonly eventId = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly currentUserId = inject(CurrentUserService).userId;
  protected readonly title = signal('');
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly error = signal(false);
  protected readonly draft = signal('');

  ngOnInit(): void {
    this.chat.connect();
    this.events
      .getEvent(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.title.set(event.title));
    this.chat
      .watchMessages(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => this.messages.update((messages) => [...messages, message]));
    this.chat
      .getHistory(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) =>
        this.messages.update((messages) => [...[...history].reverse(), ...messages]),
        error: () => this.error.set(true),
      });
  }

  ngOnDestroy(): void {
    void this.chat.disconnect();
  }

  protected send(): void {
    const content = this.draft().trim();
    if (content) {
      this.chat.send(this.eventId, content);
      this.draft.set('');
    }
  }

  protected goBack(): void {
    this.location.back();
  }
}
