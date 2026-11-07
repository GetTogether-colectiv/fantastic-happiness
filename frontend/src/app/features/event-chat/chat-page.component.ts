import { DatePipe, Location } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { RxStompState } from '@stomp/rx-stomp';
import { ChatMessage, JOIN_TO_CHAT_MESSAGE, MAX_MESSAGE_LENGTH } from '../../core/models/chat.model';
import { ChatService, HISTORY_PAGE_SIZE } from '../../core/services/chat.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { EventsService } from '../../core/services/events.service';

const NEAR_BOTTOM_PX = 100;

interface ChatRow {
  message: ChatMessage;
  startsDay: boolean;
  startsGroup: boolean;
}

@Component({
  selector: 'app-chat-page',
  imports: [DatePipe, FormsModule, MatIconModule],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly chat = inject(ChatService);
  private readonly events = inject(EventsService);
  private readonly eventId = Number(this.route.snapshot.paramMap.get('id'));
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private readonly messages = signal<ChatMessage[]>([]);
  private wasConnected = false;
  private hasOlderMessages = true;
  private loadingOlder = false;

  protected readonly currentUserId = inject(CurrentUserService).userId;
  protected readonly maxMessageLength = MAX_MESSAGE_LENGTH;
  protected readonly joinToChatMessage = JOIN_TO_CHAT_MESSAGE;
  protected readonly title = signal('');
  protected readonly error = signal(false);
  protected readonly draft = signal('');
  protected readonly reconnecting = signal(false);
  protected readonly hasNewMessages = signal(false);
  protected readonly rows = computed(() =>
    this.messages().map((message, index, messages) =>
      this.toRow(message, messages[index - 1]),
    ),
  );

  ngOnInit(): void {
    this.chat.connect();
    this.events
      .getEvent(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.title.set(event.title));
    this.chat.connectionState$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.onConnectionState(state));
    this.chat
      .watchErrors()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.error.set(true));
    this.chat
      .watchMessages(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => this.onMessage(message));
    this.chat
      .getHistory(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          this.prepend(history);
          this.afterRender(() => this.scrollToBottom());
        },
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

  protected onScroll(): void {
    if (this.isNearBottom()) {
      this.hasNewMessages.set(false);
    }
    if (this.list().nativeElement.scrollTop === 0) {
      this.loadOlder();
    }
  }

  protected showNewMessages(): void {
    this.scrollToBottom();
    this.hasNewMessages.set(false);
  }

  private onConnectionState(state: RxStompState): void {
    if (state === RxStompState.OPEN) {
      this.wasConnected = true;
      this.reconnecting.set(false);
    } else if (this.wasConnected) {
      this.reconnecting.set(true);
    }
  }

  private onMessage(message: ChatMessage): void {
    const followLatest = this.isNearBottom() || message.userId === this.currentUserId();
    this.messages.update((messages) => [...messages, message]);
    if (followLatest) {
      this.afterRender(() => this.scrollToBottom());
    } else {
      this.hasNewMessages.set(true);
    }
  }

  private loadOlder(): void {
    const oldest = this.messages()[0];
    if (!oldest || !this.hasOlderMessages || this.loadingOlder) {
      return;
    }
    this.loadingOlder = true;
    const element = this.list().nativeElement;
    const previousHeight = element.scrollHeight;
    this.chat
      .getHistory(this.eventId, oldest.sentAt)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((history) => {
        this.prepend(history);
        this.loadingOlder = false;
        this.afterRender(() => {
          element.scrollTop = element.scrollHeight - previousHeight;
        });
      });
  }

  private prepend(history: ChatMessage[]): void {
    this.hasOlderMessages = history.length === HISTORY_PAGE_SIZE;
    this.messages.update((messages) => [...[...history].reverse(), ...messages]);
  }

  private toRow(message: ChatMessage, previous?: ChatMessage): ChatRow {
    const startsDay = !previous || !this.isSameDay(previous, message);
    return {
      message,
      startsDay,
      startsGroup: startsDay || previous?.userId !== message.userId,
    };
  }

  private isSameDay(first: ChatMessage, second: ChatMessage): boolean {
    return new Date(first.sentAt).toDateString() === new Date(second.sentAt).toDateString();
  }

  private isNearBottom(): boolean {
    const { scrollHeight, scrollTop, clientHeight } = this.list().nativeElement;
    return scrollHeight - scrollTop - clientHeight <= NEAR_BOTTOM_PX;
  }

  private scrollToBottom(): void {
    const element = this.list().nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  private afterRender(action: () => void): void {
    afterNextRender(action, { injector: this.injector });
  }
}
