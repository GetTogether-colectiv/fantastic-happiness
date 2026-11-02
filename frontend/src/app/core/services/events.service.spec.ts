import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EventsService } from './events.service';

describe('EventsService', () => {
  let service: EventsService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EventsService);
    controller = TestBed.inject(HttpTestingController);
  });

  it('sends only the filters that are set', () => {
    service.getEvents({ category: 'MUSIC', city: undefined }, 2, 5).subscribe();

    const { request } = controller.expectOne((req) => req.url === '/api/events');
    expect(request.params.get('category')).toBe('MUSIC');
    expect(request.params.has('city')).toBe(false);
    expect(request.params.get('page')).toBe('2');
    expect(request.params.get('size')).toBe('5');
  });

  it('loads a single event', () => {
    service.getEvent(7).subscribe();

    controller.expectOne('/api/events/7');
  });
});
