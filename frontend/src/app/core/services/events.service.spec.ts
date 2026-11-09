import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EventRequest } from '../models/event.model';
import { EventsService } from './events.service';

const REQUEST: EventRequest = {
  title: 'Board game night',
  description: null,
  category: 'OTHER',
  startsAt: '2999-01-01T18:00:00.000Z',
  endsAt: '2999-01-01T21:00:00.000Z',
  locationName: 'Game Cafe',
  city: 'Cluj-Napoca',
  capacity: null,
  imageUrl: null,
};

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

  it('creates an event', () => {
    service.createEvent(REQUEST).subscribe();

    const { request } = controller.expectOne('/api/events');
    expect(request.method).toBe('POST');
    expect(request.body).toEqual(REQUEST);
  });

  it('updates an event', () => {
    service.updateEvent(7, REQUEST).subscribe();

    const { request } = controller.expectOne('/api/events/7');
    expect(request.method).toBe('PUT');
    expect(request.body).toEqual(REQUEST);
  });
});
