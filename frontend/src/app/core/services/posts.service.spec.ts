import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PostsService } from './posts.service';

describe('PostsService', () => {
  let service: PostsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PostsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads posts and their rating summary for an event', () => {
    const response = { averageRating: 4.3, count: 1, posts: [] };
    const received = vi.fn();

    service.getPosts(7).subscribe(received);

    const request = http.expectOne('/api/events/7/posts');
    expect(request.request.method).toBe('GET');
    request.flush(response);
    expect(received).toHaveBeenCalledWith(response);
  });

  it('publishes a post for an event', () => {
    const received = vi.fn();
    service.createPost(7, { rating: 5, text: 'Loved it' }).subscribe(received);

    const request = http.expectOne('/api/events/7/posts');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ rating: 5, text: 'Loved it' });
    request.flush({ id: 12 });
    expect(received).toHaveBeenCalledWith({ id: 12 });
  });
});
