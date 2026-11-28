import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { EventDetails } from '../../../../core/models/event.model';
import { EventPostsResponse } from '../../../../core/models/post.model';
import { AuthService } from '../../../../core/services/auth.service';
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
      photoUrls: [],
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
      photoUrls: [],
    },
  ],
};

describe('EventPostsComponent', () => {
  let fixture: ComponentFixture<EventPostsComponent>;
  let http: HttpTestingController;
  const currentUser = signal({ id: 1, displayName: 'Alexandra Pop', avatarUrl: null, city: null });
  const bottomSheet = { open: vi.fn() };
  const queryParams = new BehaviorSubject(convertToParamMap({}));
  const fragment = new BehaviorSubject<string | null>(null);
  const router = { navigate: vi.fn().mockResolvedValue(true) };

  beforeEach(() => {
    bottomSheet.open.mockReset();
    router.navigate.mockClear();
    queryParams.next(convertToParamMap({}));
    fragment.next(null);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser } },
        { provide: MatBottomSheet, useValue: bottomSheet },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParams.asObservable(),
            fragment: fragment.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}), fragment: null },
          },
        },
        { provide: Router, useValue: router },
      ],
    });
    TestBed.overrideComponent(EventPostsComponent, {
      remove: { imports: [MatBottomSheetModule] },
    });
    fixture = TestBed.createComponent(EventPostsComponent);
    fixture.componentRef.setInput('event', EVENT);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushLoad(response: EventPostsResponse, status: 'GOING' | 'NOT_INTERESTED' | null): void {
    http.expectOne('/api/events/7/posts').flush(response);
    http
      .expectOne('/api/events/7/participation')
      .flush({ status, goingCount: 2, capacity: null });
    fixture.detectChanges();
  }

  it('shows the average and newest-first post cards returned by the API', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading posts');
    flushLoad(RESPONSE, 'GOING');

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
    expect(root.querySelector('.write-post')).toBeNull();
  });

  it('shows an empty state when nobody has posted', () => {
    fixture.detectChanges();
    flushLoad({ averageRating: null, count: 0, posts: [] }, 'NOT_INTERESTED');

    expect(fixture.nativeElement.textContent).toContain('No posts yet.');
    expect(fixture.nativeElement.querySelector('app-post-card')).toBeNull();
  });

  it('offers a retry after the request fails', () => {
    fixture.detectChanges();
    http
      .expectOne('/api/events/7/posts')
      .flush(null, { status: 500, statusText: 'Server Error' });
    http
      .expectOne('/api/events/7/participation')
      .flush({ status: 'GOING', goingCount: 2, capacity: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Posts couldn't be loaded.");

    fixture.nativeElement.querySelector('app-error-state button').click();
    TestBed.tick();
    fixture.detectChanges();
    flushLoad({ averageRating: null, count: 0, posts: [] }, 'GOING');
  });

  it('shows the form only to an attendee who has not posted and prepends its result', () => {
    const initial: EventPostsResponse = {
      averageRating: 5,
      count: 1,
      posts: [RESPONSE.posts[0]],
    };
    const created = {
      id: 13,
      userId: 1,
      eventId: 7,
      authorName: 'Alexandra Pop',
      authorAvatar: null,
      rating: 4,
      text: 'My post',
      createdAt: '2026-11-23T12:00:00Z',
      photoUrls: [],
    };
    bottomSheet.open.mockReturnValue({ afterDismissed: () => of(created) });
    fixture.detectChanges();
    flushLoad(initial, 'GOING');

    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.write-post')!.click();
    fixture.detectChanges();

    expect(bottomSheet.open).toHaveBeenCalledOnce();
    expect(root.querySelector('.write-post')).toBeNull();
    expect(root.querySelectorAll('app-post-card')[0].textContent).toContain('My post');
    expect(root.textContent).toContain('4.5 ★');
    expect(root.textContent).toContain('from 2 posts');
  });

  it('opens the form automatically for the write query parameter', () => {
    bottomSheet.open.mockReturnValue({ afterDismissed: () => of(undefined) });
    queryParams.next(convertToParamMap({ write: '1' }));
    fixture.detectChanges();
    flushLoad(
      { averageRating: 5, count: 1, posts: [RESPONSE.posts[0]] },
      'GOING',
    );
    TestBed.tick();

    expect(bottomSheet.open).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { write: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('scrolls to the posts section after loading a posts fragment', () => {
    const scrollIntoView = vi.fn();
    fixture.nativeElement.scrollIntoView = scrollIntoView;
    fragment.next('posts');
    fixture.detectChanges();
    flushLoad(RESPONSE, 'GOING');

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
