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

  it('loads the comments of a post', () => {
    const received = vi.fn();
    service.getComments(12).subscribe(received);

    const request = http.expectOne('/api/posts/12/comments');
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1 }]);
    expect(received).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('publishes a comment on a post', () => {
    const received = vi.fn();
    service.createComment(12, { text: 'Nice' }).subscribe(received);

    const request = http.expectOne('/api/posts/12/comments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ text: 'Nice' });
    request.flush({ id: 1 });
    expect(received).toHaveBeenCalledWith({ id: 1 });
  });

  it('deletes a comment', () => {
    const received = vi.fn();
    service.deleteComment(1).subscribe({ complete: received });

    const request = http.expectOne('/api/comments/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    expect(received).toHaveBeenCalled();
  });
});
