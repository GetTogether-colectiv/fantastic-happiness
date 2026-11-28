import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostComment } from '../../../../../core/models/post.model';
import { AuthService } from '../../../../../core/services/auth.service';
import { PostCommentsComponent } from './post-comments.component';

const COMMENTS: PostComment[] = [
  {
    id: 1,
    postId: 12,
    userId: 1,
    authorName: 'Alexandra Pop',
    authorAvatar: null,
    text: 'Mine',
    createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  },
  {
    id: 2,
    postId: 12,
    userId: 2,
    authorName: 'Iulia Dragomir',
    authorAvatar: '/iulia.jpg',
    text: 'Theirs',
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
];

describe('PostCommentsComponent', () => {
  let fixture: ComponentFixture<PostCommentsComponent>;
  let http: HttpTestingController;
  let root: HTMLElement;
  const counts: number[] = [];

  beforeEach(() => {
    counts.length = 0;
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
    fixture = TestBed.createComponent(PostCommentsComponent);
    fixture.componentRef.setInput('postId', 12);
    fixture.componentInstance.countChange.subscribe((count) => counts.push(count));
    root = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function loadComments(comments: PostComment[]): void {
    http.expectOne('/api/posts/12/comments').flush(comments);
    fixture.detectChanges();
  }

  function type(value: string): void {
    const input = root.querySelector<HTMLInputElement>('input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    root.querySelector<HTMLFormElement>('form')!.dispatchEvent(new SubmitEvent('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  it('loads the comments with author and relative time', () => {
    expect(root.textContent).toContain('Loading comments');
    loadComments(COMMENTS);

    const items = root.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Alexandra Pop');
    expect(items[0].textContent).toContain('2h ago');
    expect(items[1].textContent).toContain('Theirs');
    expect(items[1].textContent).toContain('5m ago');
    expect(counts).toEqual([2]);
  });

  it('offers a retry after the request fails', () => {
    http.expectOne('/api/posts/12/comments').flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(root.textContent).toContain("Comments couldn't be loaded.");

    root.querySelector<HTMLButtonElement>('app-error-state button')!.click();
    loadComments([]);
    expect(root.querySelector('input')).not.toBeNull();
  });

  it('shows Delete only on the current user\'s comments', () => {
    loadComments(COMMENTS);

    const items = root.querySelectorAll('li');
    expect(items[0].querySelector('.delete')).not.toBeNull();
    expect(items[1].querySelector('.delete')).toBeNull();
  });

  it('keeps the send button disabled for empty or blank text', () => {
    loadComments([]);
    const send = root.querySelector<HTMLButtonElement>('.send')!;
    expect(send.disabled).toBe(true);

    type('   ');
    expect(send.disabled).toBe(true);

    type('Hello');
    expect(send.disabled).toBe(false);
  });

  it('limits the input to 500 characters', () => {
    loadComments([]);
    expect(root.querySelector('input')!.getAttribute('maxlength')).toBe('500');
  });

  it('appends a sent comment, clears the input and reports the new count', () => {
    loadComments(COMMENTS);
    type('  Great  ');
    submit();

    const request = http.expectOne('/api/posts/12/comments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ text: 'Great' });
    request.flush({ ...COMMENTS[0], id: 3, text: 'Great' });
    fixture.detectChanges();

    const items = root.querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[2].textContent).toContain('Great');
    expect(root.querySelector('input')!.value).toBe('');
    expect(counts.at(-1)).toBe(3);
  });

  it('does not send an empty comment', () => {
    loadComments([]);
    submit();

    http.expectNone('/api/posts/12/comments');
  });

  it('keeps the draft and shows an error when sending fails', () => {
    loadComments([]);
    type('Hello');
    submit();
    http.expectOne('/api/posts/12/comments').flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(root.querySelector('.failure')!.textContent).toContain("couldn't be sent");
    expect(root.querySelector('input')!.value).toBe('Hello');
    expect(root.querySelectorAll('li')).toHaveLength(0);
  });

  it('removes a deleted comment and reports the new count', () => {
    loadComments(COMMENTS);
    root.querySelector<HTMLButtonElement>('.delete')!.click();

    const request = http.expectOne('/api/comments/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    const items = root.querySelectorAll('li');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Theirs');
    expect(counts.at(-1)).toBe(1);
  });

  it('keeps the comment and shows an error when deleting fails', () => {
    loadComments(COMMENTS);
    root.querySelector<HTMLButtonElement>('.delete')!.click();
    http.expectOne('/api/comments/1').flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(root.querySelectorAll('li')).toHaveLength(2);
    expect(root.querySelector('.failure')!.textContent).toContain("couldn't be deleted");
  });
});
