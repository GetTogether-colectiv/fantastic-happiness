import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, effect, inject } from '@angular/core';
import { RxStomp } from '@stomp/rx-stomp';
import { Observable, map, merge, tap } from 'rxjs';
import { API_BASE_URL, AUTHORIZATION_HEADER, bearerToken } from '../api.config';
import { AuthResponse } from '../models/auth.model';
import { ChatMessage } from '../models/chat.model';
import { AuthService } from './auth.service';

export const HISTORY_PAGE_SIZE = 30;
const RECONNECT_DELAY_MS = 3000;
const WEBSOCKET_PATH = `${API_BASE_URL}/ws`;
const ERROR_QUEUE = '/user/queue/errors';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private rxStomp = new RxStomp();
  private clientSession: AuthResponse | null = null;

  constructor() {
    effect(() => {
      const session = this.auth.session();
      if (this.clientSession && this.clientSession !== session) this.endSession();
    });
  }

  get connectionState$() {
    return this.rxStomp.connectionState$;
  }

  connect(): void {
    const session = this.auth.session();
    if (!session || !this.auth.isLoggedIn()) return;

    if (this.clientSession !== session) {
      this.endSession();
      this.clientSession = session;
    }

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    this.rxStomp.configure({
      brokerURL: `${protocol}://${location.host}${WEBSOCKET_PATH}`,
      beforeConnect: async (client) => {
        if (this.auth.session() !== session || !this.auth.isLoggedIn()) {
          await client.deactivate({ force: true });
          return;
        }
        client.configure({
          connectHeaders: { [AUTHORIZATION_HEADER]: bearerToken(session.token) },
        });
      },
      reconnectDelay: RECONNECT_DELAY_MS,
    });
    this.rxStomp.activate();
  }

  disconnect(): Promise<void> {
    return this.rxStomp.deactivate();
  }

  endSession(): void {
    if (!this.clientSession) return;

    const previous = this.rxStomp;
    this.clientSession = null;
    this.rxStomp = new RxStomp();
    void previous.deactivate({ force: true }).catch(() => undefined);
  }

  getHistory(eventId: number, before?: string): Observable<ChatMessage[]> {
    let params = new HttpParams().set('size', HISTORY_PAGE_SIZE);
    if (before) {
      params = params.set('before', before);
    }
    return this.http.get<ChatMessage[]>(`${API_BASE_URL}/events/${eventId}/messages`, { params });
  }

  getMessageCount(eventId: number): Observable<number> {
    return this.http.get<number>(`${API_BASE_URL}/events/${eventId}/messages/count`);
  }

  watchMessages(eventId: number): Observable<ChatMessage> {
    return this.rxStomp
      .watch(`/topic/events/${eventId}/chat`)
      .pipe(map((message) => JSON.parse(message.body) as ChatMessage));
  }

  watchErrors(): Observable<string> {
    const client = this.rxStomp;
    const queueErrors = client.watch(ERROR_QUEUE).pipe(map((message) => message.body));
    const protocolErrors = client.stompErrors$.pipe(
      tap(() => {
        if (client === this.rxStomp) this.endSession();
      }),
      map((frame) => frame.headers['message'] ?? frame.body),
    );
    return merge(queueErrors, protocolErrors);
  }

  send(eventId: number, content: string): void {
    if (
      !this.clientSession ||
      this.clientSession !== this.auth.session() ||
      !this.auth.isLoggedIn()
    ) {
      return;
    }

    this.rxStomp.publish({
      destination: `/app/events/${eventId}/chat`,
      body: JSON.stringify({ content }),
    });
  }
}
