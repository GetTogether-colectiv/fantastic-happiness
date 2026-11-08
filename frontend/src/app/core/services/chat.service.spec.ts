import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
  afterEach(() => http.verify());

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
});
