import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RxStomp } from '@stomp/rx-stomp';
import { EMPTY } from 'rxjs';
import { AUTH_STORAGE_KEY, signIn } from '../testing/auth-fixtures';
import { AuthService } from './auth.service';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    vi.restoreAllMocks();
  });

  it('loads the latest page of messages', () => {
    service.getHistory(7).subscribe();
    const request = http.expectOne((r) => r.url === '/api/events/7/messages');
    expect(request.request.params.get('size')).toBe('30');
    expect(request.request.params.has('before')).toBe(false);
    request.flush([]);
  });

  it('loads older messages before a given time', () => {
    service.getHistory(7, '2026-11-06T14:00:00Z').subscribe();
    const request = http.expectOne((r) => r.url === '/api/events/7/messages');
    expect(request.request.params.get('before')).toBe('2026-11-06T14:00:00Z');
    request.flush([]);
  });

  it('loads the message count', () => {
    const next = vi.fn();
    service.getMessageCount(7).subscribe(next);
    http.expectOne('/api/events/7/messages/count').flush(12);
    expect(next).toHaveBeenCalledWith(12);
  });

  it('surfaces a STOMP denial and discards the client before the next connection', () => {
    const activate = vi.spyOn(RxStomp.prototype, 'activate').mockImplementation(() => undefined);
    const deactivate = vi.spyOn(RxStomp.prototype, 'deactivate').mockResolvedValue();
    vi.spyOn(RxStomp.prototype, 'watch').mockReturnValue(EMPTY);
    const next = vi.fn();

    signIn();
    service.connect();
    const client = activate.mock.contexts[0] as RxStomp;
    const errors = service.watchErrors().subscribe(next);
    client.stompErrors$.next({
      command: 'ERROR',
      headers: { message: 'NOT_GOING' },
      body: '',
      binaryBody: new Uint8Array(),
      isBinaryBody: false,
    });

    expect(next).toHaveBeenCalledWith('NOT_GOING');
    expect(deactivate.mock.contexts).toEqual([client]);
    expect(deactivate).toHaveBeenCalledWith({ force: true });
    errors.unsubscribe();

    service.connect();
    expect(activate.mock.contexts[1]).not.toBe(client);
  });

  it('uses the owning session JWT on each connection and retires the client at session end', async () => {
    const activate = vi.spyOn(RxStomp.prototype, 'activate').mockImplementation(() => undefined);
    const deactivate = vi.spyOn(RxStomp.prototype, 'deactivate').mockResolvedValue();
    const configure = vi.spyOn(RxStomp.prototype, 'configure');
    const publish = vi.spyOn(RxStomp.prototype, 'publish');

    service.connect();
    expect(activate).not.toHaveBeenCalled();

    const first = signIn();
    service.connect();
    const beforeFirstConnect = configure.mock.calls[0][0].beforeConnect!;
    const oldClient = configure.mock.contexts[0] as RxStomp;
    await beforeFirstConnect(oldClient);
    await beforeFirstConnect(oldClient);
    expect(configure).toHaveBeenLastCalledWith({
      connectHeaders: { Authorization: `Bearer ${first.token}` },
    });
    service.send(7, 'Queued by the first user');
    expect(publish.mock.contexts[0]).toBe(oldClient);

    TestBed.inject(AuthService).clearSession();
    TestBed.tick();
    expect(deactivate).toHaveBeenCalledWith({ force: true });
    expect(deactivate.mock.contexts[0]).toBe(oldClient);
    service.send(7, 'Cannot send while signed out');
    expect(publish).toHaveBeenCalledTimes(1);

    const second = signIn(2);
    service.connect();
    const last = configure.mock.calls.length - 1;
    const newClient = configure.mock.contexts[last] as RxStomp;
    expect(newClient).not.toBe(oldClient);
    await configure.mock.calls[last][0].beforeConnect!(newClient);
    expect(configure).toHaveBeenLastCalledWith({
      connectHeaders: { Authorization: `Bearer ${second.token}` },
    });
    await beforeFirstConnect(oldClient);
    expect(deactivate.mock.contexts.at(-1)).toBe(oldClient);
  });
});
