import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CurrentUserService } from '../services/current-user.service';
import { userIdInterceptor } from './user-id.interceptor';

describe('userIdInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([userIdInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  it('adds the current user id to api requests', () => {
    TestBed.inject(CurrentUserService).select(3);

    http.get('/api/users/me').subscribe();

    expect(controller.expectOne('/api/users/me').request.headers.get('X-User-Id')).toBe('3');
  });

  it('leaves other requests untouched', () => {
    http.get('/assets/data.json').subscribe();

    expect(controller.expectOne('/assets/data.json').request.headers.has('X-User-Id')).toBe(false);
  });
});
