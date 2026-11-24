import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FriendsService } from './friends.service';

describe('FriendsService', () => {
  let service: FriendsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FriendsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads friends and incoming requests', () => {
    service.getFriends().subscribe();
    service.getIncomingRequests().subscribe();
    expect(http.expectOne('/api/friends').request.method).toBe('GET');
    expect(http.expectOne('/api/friends/requests/incoming').request.method).toBe('GET');
  });

  it('searches users with an encoded query', () => {
    service.searchUsers('ana maria').subscribe();
    const request = http.expectOne((req) => req.url === '/api/users/search');
    expect(request.request.params.get('q')).toBe('ana maria');
  });

  it('loads the relation to one user', () => {
    const received = vi.fn();
    service.getRelation(7).subscribe(received);
    http.expectOne('/api/users/7/relation').flush({ relation: 'INCOMING' });
    expect(received).toHaveBeenCalledWith('INCOMING');
  });

  it('sends a request with the user id in the body', () => {
    service.sendRequest(7).subscribe();
    const request = http.expectOne('/api/friends/requests');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ userId: 7 });
  });

  it('accepts, declines and removes through their endpoints', () => {
    service.acceptRequest(3).subscribe();
    service.declineRequest(4).subscribe();
    service.removeFriend(5).subscribe();
    expect(http.expectOne('/api/friends/requests/3/accept').request.method).toBe('POST');
    expect(http.expectOne('/api/friends/requests/4/decline').request.method).toBe('POST');
    expect(http.expectOne('/api/friends/5').request.method).toBe('DELETE');
  });
});
