import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FriendRelation } from '../../core/models/friend.model';
import { User } from '../../core/models/user.model';
import { AUTH_STORAGE_KEY, signIn } from '../../core/testing/auth-fixtures';
import { UserPageComponent } from './user-page.component';

const ANA: User = { id: 7, displayName: 'Ana Pop', avatarUrl: null, city: 'Cluj-Napoca' };

describe('UserPageComponent', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'users/:id', component: UserPageComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    signIn(1);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(AUTH_STORAGE_KEY);
  });

  async function open(relation: FriendRelation, user: User = ANA): Promise<HTMLElement> {
    await harness.navigateByUrl(`/users/${user.id}`, UserPageComponent);
    http.expectOne(`/api/users/${user.id}`).flush(user);
    http.expectOne(`/api/users/${user.id}/relation`).flush({ relation });
    harness.detectChanges();
    return harness.routeNativeElement!;
  }

  function relationButton(page: HTMLElement): HTMLButtonElement | null {
    return page.querySelector<HTMLButtonElement>('button.relation');
  }

  function label(button: HTMLButtonElement | null): string | undefined {
    return button?.textContent?.replace(button.querySelector('mat-icon')!.textContent!, '').trim();
  }

  it('shows the name, avatar and city of the user', async () => {
    const page = await open('NONE');

    expect(page.querySelector('h1')?.textContent).toBe('Ana Pop');
    expect(page.querySelector('.city')?.textContent).toBe('Cluj-Napoca');
    expect(page.querySelector('app-avatar')?.textContent?.trim()).toBe('AP');
  });

  it.each([
    ['NONE', 'Add friend', false],
    ['REQUESTED', 'Request sent', true],
    ['INCOMING', 'Accept request', false],
    ['FRIENDS', 'Friends', true],
  ] as const)('shows the %s relation as "%s"', async (relation, text, disabled) => {
    const button = relationButton(await open(relation));

    expect(label(button)).toBe(text);
    expect(button?.disabled).toBe(disabled);
  });

  it('sends a request and shows "Request sent" right away', async () => {
    const page = await open('NONE');

    relationButton(page)!.click();
    harness.detectChanges();
    expect(label(relationButton(page))).toBe('Request sent');

    const request = http.expectOne('/api/friends/requests');
    expect(request.request.body).toEqual({ userId: ANA.id });
    request.flush({ id: 1, status: 'PENDING' }, { status: 201, statusText: 'Created' });
    harness.detectChanges();
    expect(label(relationButton(page))).toBe('Request sent');
  });

  it('accepts their pending request and shows "Friends"', async () => {
    const page = await open('INCOMING');

    relationButton(page)!.click();
    http.expectOne('/api/friends/requests').flush({ id: 1, status: 'ACCEPTED' });
    harness.detectChanges();

    expect(label(relationButton(page))).toBe('Friends');
  });

  it('goes back to "Add friend" when the request fails', async () => {
    const page = await open('NONE');

    relationButton(page)!.click();
    http.expectOne('/api/friends/requests').flush(null, { status: 500, statusText: 'Error' });
    harness.detectChanges();

    expect(label(relationButton(page))).toBe('Add friend');
    expect(page.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('shows no friend button on your own profile', async () => {
    await harness.navigateByUrl('/users/1', UserPageComponent);
    http.expectOne('/api/users/1').flush({ ...ANA, id: 1 });
    http.expectNone('/api/users/1/relation');
    harness.detectChanges();

    expect(relationButton(harness.routeNativeElement!)).toBeNull();
  });

  it('still shows the profile when the relation cannot be loaded', async () => {
    await harness.navigateByUrl('/users/7', UserPageComponent);
    http.expectOne('/api/users/7').flush(ANA);
    http.expectOne('/api/users/7/relation').flush(null, { status: 500, statusText: 'Error' });
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe('Ana Pop');
    expect(relationButton(harness.routeNativeElement!)).toBeNull();
  });

  it('retries after a failed load', async () => {
    await harness.navigateByUrl('/users/7', UserPageComponent);
    const relation = http.expectOne('/api/users/7/relation');
    http.expectOne('/api/users/7').flush(null, { status: 500, statusText: 'Server Error' });
    expect(relation.cancelled).toBe(true);
    harness.detectChanges();

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('app-error-state button')!.click();
    http.expectOne('/api/users/7').flush(ANA);
    http.expectOne('/api/users/7/relation').flush({ relation: 'FRIENDS' });
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe('Ana Pop');
  });
});
