import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventDetails } from '../../../../core/models/event.model';
import { EventPostsResponse } from '../../../../core/models/post.model';
import { EventPostsComponent } from './event-posts.component';

const EVENT: EventDetails = {
  id: 7,
  title: 'Past event',
  category: 'OTHER',
  startsAt: '2026-11-10T18:00:00Z',
  endsAt: '2026-11-10T20:00:00Z',
  city: 'Cluj-Napoca',
  locationName: 'Central Park',
  latitude: null,
  longitude: null,
  imageUrl: null,
  capacity: null,
  goingCount: 2,
  description: null,
  organizerId: 1,
  createdAt: '2026-11-01T12:00:00Z',
};

const RESPONSE: EventPostsResponse = {
  averageRating: 4.3,
  count: 2,
  posts: [
    {
      id: 12,
      userId: 2,
      eventId: 7,
      authorName: 'Iulia Dragomir',
      authorAvatar: '/iulia.jpg',
      rating: 5,
      text: 'A wonderful evening.',
      createdAt: '2026-11-12T10:00:00Z',
    },
    {
      id: 11,
      userId: 1,
      eventId: 7,
      authorName: 'Alexandra Pop',
      authorAvatar: null,
      rating: 3,
      text: null,
      createdAt: '2026-11-11T10:00:00Z',
    },
  ],
};

describe('EventPostsComponent', () => {
  let fixture: ComponentFixture<EventPostsComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(EventPostsComponent);
    fixture.componentRef.setInput('event', EVENT);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows the average and newest-first post cards returned by the API', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading posts');
    http.expectOne('/api/events/7/posts').flush(RESPONSE);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('How was it?');
    expect(root.textContent).toContain('4.3 ★');
    expect(root.textContent).toContain('from 2 posts');
    const cards = root.querySelectorAll('app-post-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Iulia Dragomir');
    expect(cards[0].textContent).toContain('A wonderful evening.');
    expect(cards[0].querySelector('img')?.getAttribute('src')).toBe('/iulia.jpg');
    expect(cards[0].querySelector('time')?.getAttribute('datetime')).toBe(
      RESPONSE.posts[0].createdAt,
    );
    expect(cards[1].textContent).toContain('Alexandra Pop');
    expect(cards[1].querySelector('p')).toBeNull();
  });

  it('shows an empty state when nobody has posted', () => {
    fixture.detectChanges();
    http
      .expectOne('/api/events/7/posts')
      .flush({ averageRating: null, count: 0, posts: [] } satisfies EventPostsResponse);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No posts yet.');
    expect(fixture.nativeElement.querySelector('app-post-card')).toBeNull();
  });

  it('offers a retry after the request fails', () => {
    fixture.detectChanges();
    http
      .expectOne('/api/events/7/posts')
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Posts couldn't be loaded.");

    fixture.nativeElement.querySelector('app-error-state button').click();
    TestBed.tick();
    fixture.detectChanges();
    http
      .expectOne('/api/events/7/posts')
      .flush({ averageRating: null, count: 0, posts: [] } satisfies EventPostsResponse);
  });
});
