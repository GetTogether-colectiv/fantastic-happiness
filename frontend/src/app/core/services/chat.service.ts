import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { RxStomp } from '@stomp/rx-stomp';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { ChatMessage } from '../models/chat.model';
import { CurrentUserService } from './current-user.service';

const HISTORY_PAGE_SIZE = 30;
const RECONNECT_DELAY_MS = 3000;
const USER_ID_HEADER = 'X-User-Id';
const WEBSOCKET_PATH = `${API_BASE_URL}/ws`;
const ERROR_QUEUE = '/user/queue/errors';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = inject(CurrentUserService);
  private readonly rxStomp = new RxStomp();

  readonly connectionState$ = this.rxStomp.connectionState$;

  connect(): void {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    this.rxStomp.configure({
      brokerURL: `${protocol}://${location.host}${WEBSOCKET_PATH}`,
      connectHeaders: { [USER_ID_HEADER]: String(this.currentUser.userId()) },
      reconnectDelay: RECONNECT_DELAY_MS,
    });
    this.rxStomp.activate();
  }

  disconnect(): Promise<void> {
    return this.rxStomp.deactivate();
  }

  getHistory(eventId: number, before?: string): Observable<ChatMessage[]> {
    let params = new HttpParams().set('size', HISTORY_PAGE_SIZE);
    if (before) {
      params = params.set('before', before);
    }
    return this.http.get<ChatMessage[]>(`${API_BASE_URL}/events/${eventId}/messages`, { params });
  }

  watchMessages(eventId: number): Observable<ChatMessage> {
    return this.rxStomp
      .watch(`/topic/events/${eventId}/chat`)
      .pipe(map((message) => JSON.parse(message.body) as ChatMessage));
  }

  watchErrors(): Observable<string> {
    return this.rxStomp.watch(ERROR_QUEUE).pipe(map((message) => message.body));
  }

  send(eventId: number, content: string): void {
    this.rxStomp.publish({
      destination: `/app/events/${eventId}/chat`,
      body: JSON.stringify({ content }),
    });
  }
}
