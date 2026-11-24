import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FriendRequest, UserSearchResult } from '../../core/models/friend.model';
import { User } from '../../core/models/user.model';
import { FriendsPageComponent, SEARCH_DEBOUNCE_MS } from './friends-page.component';

const ANA: User = { id: 2, displayName: 'Ana Pop', avatarUrl: null, city: 'Cluj-Napoca' };
const BOGDAN: User = { id: 3, displayName: 'Bogdan Ilie', avatarUrl: null, city: null };
const CARLA: User = { id: 4, displayName: 'Carla Rus', avatarUrl: null, city: 'Iasi' };
const CARLA_REQUEST: FriendRequest = { id: 40, user: CARLA, createdAt: '2026-11-20T10:00:00Z' };

function result(user: User, relation: UserSearchResult['relation']): UserSearchResult {
  return { ...user, relation };
}

describe('FriendsPageComponent', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<FriendsPageComponent>;
  let page: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FriendsPageComponent);
    page = fixture.nativeElement;
    http.expectOne('/api/friends').flush([ANA]);
    http.expectOne('/api/friends/requests/incoming').flush([CARLA_REQUEST]);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  function type(text: string): void {
    const input = page.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
  }

  function search(text: string, results: UserSearchResult[]): void {
    type(text);
    const request = http.expectOne((req) => req.url === '/api/users/search');
    expect(request.request.params.get('q')).toBe(text.trim());
    request.flush(results);
    fixture.detectChanges();
  }

  function buttonIn(container: string, label: string): HTMLButtonElement {
    return Array.from(page.querySelectorAll<HTMLButtonElement>(`${container} button`)).find(
      (button) => button.textContent?.trim() === label,
    )!;
  }

  function names(container: string): string[] {
    return Array.from(page.querySelectorAll(`${container} .name`)).map((n) => n.textContent!);
  }

  it('shows the incoming requests with a badge and the friends list', () => {
    expect(page.querySelector('.requests .badge')?.textContent?.trim()).toBe('1');
    expect(names('.requests')).toEqual(['Carla Rus']);
    expect(names('.friends')).toEqual(['Ana Pop']);
    expect(page.querySelector('.friends .city')?.textContent).toBe('Cluj-Napoca');
    expect(page.querySelector('#friends-title')?.textContent).toContain('Friends · 1');
    expect(page.querySelector('.friends .identity')?.getAttribute('href')).toBe('/users/2');
  });

  it('searches only after two letters, once typing pauses, and drops repeated queries', () => {
    type('B');
    http.expectNone((req) => req.url === '/api/users/search');

    type('Bo');
    type(' Bo ');
    http.expectOne((req) => req.url === '/api/users/search').flush([result(BOGDAN, 'NONE')]);
    fixture.detectChanges();

    expect(names('.results')).toEqual(['Bogdan Ilie']);
  });

  it('cancels a slower search when the query changes', () => {
    type('Bo');
    const stale = http.expectOne((req) => req.url === '/api/users/search');
    search('Bog', [result(BOGDAN, 'NONE')]);

    expect(stale.cancelled).toBe(true);
  });

  it('labels each result by its relation', () => {
    search('ra', [
      result(ANA, 'FRIENDS'),
      result(BOGDAN, 'REQUESTED'),
      result(CARLA, 'INCOMING'),
      result({ ...BOGDAN, id: 9, displayName: 'Dan' }, 'NONE'),
    ]);

    const labels = Array.from(page.querySelectorAll<HTMLButtonElement>('.results .relation')).map(
      (button) => [button.textContent?.trim(), button.disabled],
    );
    expect(labels).toEqual([
      ['Friends', true],
      ['Requested', true],
      ['Accept', false],
      ['Add', false],
    ]);
  });

  it('shows "Requested" right after tapping Add and keeps it when the request succeeds', () => {
    search('Bo', [result(BOGDAN, 'NONE')]);

    buttonIn('.results', 'Add').click();
    fixture.detectChanges();
    expect(buttonIn('.results', 'Requested').disabled).toBe(true);

    const request = http.expectOne('/api/friends/requests');
    expect(request.request.body).toEqual({ userId: BOGDAN.id });
    request.flush({ id: 50, status: 'PENDING' }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    expect(buttonIn('.results', 'Requested')).toBeTruthy();
  });

  it('goes back to "Add" and reports the failure when the request fails', () => {
    search('Bo', [result(BOGDAN, 'NONE')]);

    buttonIn('.results', 'Add').click();
    http
      .expectOne('/api/friends/requests')
      .flush(
        { status: 409, message: 'REQUEST_ALREADY_SENT' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(buttonIn('.results', 'Add')).toBeTruthy();
    expect(page.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('accepts an incoming request when tapping Accept on a search result', () => {
    search('Ca', [result(CARLA, 'INCOMING')]);

    buttonIn('.results', 'Accept').click();
    fixture.detectChanges();

    expect(page.querySelector('.requests')).toBeNull();
    expect(names('.friends')).toEqual(['Ana Pop', 'Carla Rus']);
    expect(buttonIn('.results', 'Friends').disabled).toBe(true);
    const request = http.expectOne('/api/friends/requests');
    expect(request.request.body).toEqual({ userId: CARLA.id });
    request.flush({ id: CARLA_REQUEST.id, status: 'ACCEPTED' });
  });

  it('moves an accepted request into the friends list immediately', () => {
    buttonIn('.requests', 'Accept').click();
    fixture.detectChanges();

    expect(page.querySelector('.requests')).toBeNull();
    expect(names('.friends')).toEqual(['Ana Pop', 'Carla Rus']);
    http.expectOne('/api/friends/requests/40/accept').flush({ id: 40, status: 'ACCEPTED' });
  });

  it('puts a declined request back when declining fails', () => {
    buttonIn('.requests', 'Decline').click();
    fixture.detectChanges();
    expect(page.querySelector('.requests')).toBeNull();

    http
      .expectOne('/api/friends/requests/40/decline')
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(names('.requests')).toEqual(['Carla Rus']);
  });

  it('removes a friend from the ⋯ menu', () => {
    const toggle = page.querySelector<HTMLButtonElement>('.menu-toggle')!;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    buttonIn('.menu', 'Remove friend').click();
    fixture.detectChanges();

    expect(names('.friends')).toEqual([]);
    expect(page.querySelector('.friends app-empty-state')).not.toBeNull();
    expect(http.expectOne('/api/friends/2').request.method).toBe('DELETE');
  });

  it('closes the ⋯ menu when clicking elsewhere', () => {
    page.querySelector<HTMLButtonElement>('.menu-toggle')!.click();
    fixture.detectChanges();
    expect(page.querySelector('.menu')).not.toBeNull();

    document.body.click();
    fixture.detectChanges();

    expect(page.querySelector('.menu')).toBeNull();
  });
});
