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
});
