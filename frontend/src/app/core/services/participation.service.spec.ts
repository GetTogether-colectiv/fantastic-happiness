import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ParticipationService } from './participation.service';

describe('ParticipationService', () => {
  let service: ParticipationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ParticipationService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads ten feed events by default and supports a custom size', () => {
    service.getFeed().subscribe();
    http.expectOne('/api/participation/feed?size=10').flush([]);
    service.getFeed(3).subscribe();
    http.expectOne('/api/participation/feed?size=3').flush([]);
  });

  it.each(['GOING', 'NOT_INTERESTED'] as const)(
    'sends %s to the participation endpoint',
    (status) => {
      service.setStatus(7, status).subscribe();
      const request = http.expectOne('/api/events/7/participation');
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ status });
      request.flush({ status, goingCount: 1, capacity: 20 });
    },
  );

  it.each(['UPCOMING', 'PAST'] as const)('loads my %s events', (when) => {
    const received = vi.fn();
    service.getMyEvents(when).subscribe(received);
    const request = http.expectOne(`/api/me/events?when=${when}`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
    expect(received).toHaveBeenCalledWith([]);
  });

  it('passes a full-event error to the caller', () => {
    const error = vi.fn();
    service.setStatus(7, 'GOING').subscribe({ error });
    http.expectOne('/api/events/7/participation').flush(
      { message: 'EVENT_FULL' },
      {
        status: 409,
        statusText: 'Conflict',
      },
    );
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ status: 409 }));
  });

  it('loads the current participation, going count and capacity', () => {
    const response = { status: 'GOING', goingCount: 12, capacity: 20 };
    const received = vi.fn();
    service.getParticipation(7).subscribe(received);
    const request = http.expectOne('/api/events/7/participation');
    expect(request.request.method).toBe('GET');
    request.flush(response);
    expect(received).toHaveBeenCalledWith(response);
  });

  it('removes participation and accepts an empty 204 response', () => {
    const complete = vi.fn();
    service.removeParticipation(7).subscribe({ complete });
    const request = http.expectOne('/api/events/7/participation');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(complete).toHaveBeenCalledOnce();
  });
});
