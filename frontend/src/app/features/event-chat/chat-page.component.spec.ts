import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { RxStompState } from '@stomp/rx-stomp';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { ChatMessage } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { EventsService } from '../../core/services/events.service';
import { ChatPageComponent } from './chat-page.component';

const EVENT_ID = 6;
const CURRENT_USER = 1;
const OTHER_USER = 2;

function message(id: number, userId: number, content: string): ChatMessage {
  return {
    id,
    eventId: EVENT_ID,
    userId,
    userName: `User ${userId}`,
    userAvatarUrl: null,
    content,
    sentAt: '2026-11-06T14:00:00Z',
  };
}

class FakeChatService {
  readonly connectionState$ = new BehaviorSubject(RxStompState.CONNECTING);
  readonly history = new Subject<ChatMessage[]>();
  readonly messages = new Subject<ChatMessage>();
  readonly errors = new Subject<string>();
  readonly connect = vi.fn();
  readonly disconnect = vi.fn().mockResolvedValue(undefined);
  readonly send = vi.fn();
  readonly getHistory = vi.fn(() => this.history);
  readonly watchMessages = vi.fn(() => this.messages);
  readonly watchErrors = vi.fn(() => this.errors);
}

describe('ChatPageComponent', () => {
  let fixture: ComponentFixture<ChatPageComponent>;
  let chat: FakeChatService;

  beforeEach(() => {
    localStorage.clear();
    chat = new FakeChatService();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ChatService, useValue: chat },
        { provide: EventsService, useValue: { getEvent: () => of({ title: 'Morning Run' }) } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: String(EVENT_ID) }) } },
        },
      ],
    });
    TestBed.inject(CurrentUserService).select(CURRENT_USER);
    fixture = TestBed.createComponent(ChatPageComponent);
    fixture.detectChanges();
  });

  function texts(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.message p')).map(
      (element) => element.textContent?.trim() ?? '',
    );
  }

  it('connects and shows the title and history from oldest to newest', () => {
    chat.history.next([message(2, OTHER_USER, 'Second'), message(1, OTHER_USER, 'First')]);
    fixture.detectChanges();

    expect(chat.connect).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Morning Run');
    expect(texts()).toEqual(['First', 'Second']);
  });

  it('appends live messages and marks the current user messages as own', () => {
    chat.history.next([]);
    chat.messages.next(message(1, OTHER_USER, 'Hello'));
    chat.messages.next(message(2, CURRENT_USER, 'Hi'));
    fixture.detectChanges();

    const messages = fixture.nativeElement.querySelectorAll('.message');
    expect(texts()).toEqual(['Hello', 'Hi']);
    expect(messages[0].classList).not.toContain('own');
    expect(messages[1].classList).toContain('own');
  });

  it('sends a trimmed message and ignores blank input', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    input.value = '  See you there  ';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));

    expect(chat.send).toHaveBeenCalledOnce();
    expect(chat.send).toHaveBeenCalledWith(EVENT_ID, 'See you there');
  });

  it('shows the reconnect bar only after an open connection drops', () => {
    expect(fixture.nativeElement.querySelector('.reconnecting')).toBeNull();

    chat.connectionState$.next(RxStompState.OPEN);
    chat.connectionState$.next(RxStompState.CLOSED);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.reconnecting')).not.toBeNull();

    chat.connectionState$.next(RxStompState.OPEN);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.reconnecting')).toBeNull();
  });

  it('asks the user to join when the history is forbidden', () => {
    chat.history.error(new HttpErrorResponse({ status: 403 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Join the event to chat');
  });

  it('disconnects when the page is closed', () => {
    fixture.destroy();

    expect(chat.disconnect).toHaveBeenCalledOnce();
  });
});
