import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventPost } from '../../../../../core/models/post.model';
import { AuthService } from '../../../../../core/services/auth.service';
import { PostCardComponent } from './post-card.component';

const POST: EventPost = {
  id: 12,
  userId: 2,
  eventId: 7,
  authorName: 'Iulia Dragomir',
  authorAvatar: null,
  rating: 5,
  text: 'A wonderful evening.',
  createdAt: '2026-11-12T10:00:00Z',
  photoUrls: [],
  commentCount: 3,
};

describe('PostCardComponent', () => {
  let fixture: ComponentFixture<PostCardComponent>;
  let http: HttpTestingController;
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ id: 1, displayName: 'Alexandra Pop', avatarUrl: null, city: null }),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PostCardComponent);
    fixture.componentRef.setInput('post', POST);
    root = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const toggle = () => root.querySelector<HTMLButtonElement>('.comments-toggle')!;

  it('shows the comment count without loading the comments', () => {
    expect(toggle().textContent?.trim()).toBe('3 comments');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('app-post-comments')).toBeNull();
    http.expectNone('/api/posts/12/comments');
  });

  it('uses the singular for one comment', () => {
    fixture.componentRef.setInput('post', { ...POST, commentCount: 1 });
    fixture.detectChanges();

    expect(toggle().textContent?.trim()).toBe('1 comment');
  });

  it('loads and shows the comments when expanded, and hides them again', () => {
    toggle().click();
    fixture.detectChanges();

    http.expectOne('/api/posts/12/comments').flush([]);
    fixture.detectChanges();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('app-post-comments')).not.toBeNull();

    toggle().click();
    fixture.detectChanges();
    expect(root.querySelector('app-post-comments')).toBeNull();
  });

  it('updates the counter when a comment is added', () => {
    toggle().click();
    fixture.detectChanges();
    http.expectOne('/api/posts/12/comments').flush([
      { id: 1, postId: 12, userId: 1, authorName: 'A', authorAvatar: null, text: 'x', createdAt: POST.createdAt },
    ]);
    fixture.detectChanges();

    expect(toggle().textContent?.trim()).toBe('1 comment');
  });
});
