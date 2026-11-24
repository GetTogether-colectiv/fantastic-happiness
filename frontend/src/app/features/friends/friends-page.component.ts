import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  EMPTY,
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  switchMap,
  tap,
} from 'rxjs';
import { FriendRelation, FriendRequest, UserSearchResult } from '../../core/models/friend.model';
import { User } from '../../core/models/user.model';
import { FriendsService } from '../../core/services/friends.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';

type FriendsState = 'loading' | 'loaded' | 'error';

// Must match FriendshipService.SEARCH_MIN_LENGTH on the backend.
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_DEBOUNCE_MS = 300;

const RELATION_LABELS: Record<FriendRelation, string> = {
  NONE: 'Add',
  REQUESTED: 'Requested',
  INCOMING: 'Accept',
  FRIENDS: 'Friends',
};
const ADDABLE_RELATIONS: ReadonlySet<FriendRelation> = new Set(['NONE', 'INCOMING']);

@Component({
  selector: 'app-friends-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    AvatarComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonCardComponent,
  ],
  templateUrl: './friends-page.component.html',
  styleUrl: './friends-page.component.scss',
  host: {
    '(document:click)': 'closeMenu()',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class FriendsPageComponent {
  private readonly friendsService = inject(FriendsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly query = new FormControl('', { nonNullable: true });
  protected readonly state = signal<FriendsState>('loading');
  protected readonly friends = signal<User[]>([]);
  protected readonly requests = signal<FriendRequest[]>([]);
  protected readonly results = signal<UserSearchResult[]>([]);
  protected readonly searchedQuery = signal('');
  protected readonly searchFailed = signal(false);
  protected readonly actionFailed = signal(false);
  protected readonly menuOpenFor = signal<number | null>(null);
  protected readonly relationLabels = RELATION_LABELS;

  constructor() {
    this.load();
    this.query.valueChanges
      .pipe(
        map((query) => query.trim()),
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) => this.search(query)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected load(): void {
    this.state.set('loading');
    forkJoin({
      friends: this.friendsService.getFriends(),
      requests: this.friendsService.getIncomingRequests(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ friends, requests }) => {
          this.friends.set(friends);
          this.requests.set(requests);
          this.state.set('loaded');
        },
        error: () => this.state.set('error'),
      });
  }

  protected isAddable(result: UserSearchResult): boolean {
    return ADDABLE_RELATIONS.has(result.relation);
  }

  protected add(result: UserSearchResult): void {
    const user = toUser(result);
    if (result.relation === 'INCOMING') {
      const incoming = this.requests().find((request) => request.user.id === user.id);
      this.runOptimistically(
        this.friendsService.sendRequest(user.id),
        () => this.showFriendship(user, incoming),
        () => this.undoFriendship(user, incoming),
      );
      return;
    }
    this.runOptimistically(
      this.friendsService.sendRequest(user.id).pipe(
        tap((response) => {
          if (response.status === 'ACCEPTED') {
            this.showFriendship(
              user,
              this.requests().find((r) => r.user.id === user.id),
            );
          }
        }),
      ),
      () => this.setRelation(user.id, 'REQUESTED'),
      () => this.setRelation(user.id, 'NONE'),
    );
  }

  protected accept(request: FriendRequest): void {
    this.runOptimistically(
      this.friendsService.acceptRequest(request.id),
      () => this.showFriendship(request.user, request),
      () => this.undoFriendship(request.user, request),
    );
  }

  protected decline(request: FriendRequest): void {
    this.runOptimistically(
      this.friendsService.declineRequest(request.id),
      () => {
        this.dropRequest(request);
        this.setRelation(request.user.id, 'NONE');
      },
      () => {
        this.restoreRequest(request);
        this.setRelation(request.user.id, 'INCOMING');
      },
    );
  }

  protected removeFriend(friend: User): void {
    this.closeMenu();
    this.runOptimistically(
      this.friendsService.removeFriend(friend.id),
      () => {
        this.dropFriend(friend);
        this.setRelation(friend.id, 'NONE');
      },
      () => {
        this.addFriend(friend);
        this.setRelation(friend.id, 'FRIENDS');
      },
    );
  }

  protected toggleMenu(friendId: number, event: Event): void {
    event.stopPropagation();
    this.menuOpenFor.update((openFor) => (openFor === friendId ? null : friendId));
  }

  protected closeMenu(): void {
    this.menuOpenFor.set(null);
  }

  private search(query: string): Observable<unknown> {
    this.searchFailed.set(false);
    if (query.length < SEARCH_MIN_LENGTH) {
      this.results.set([]);
      this.searchedQuery.set('');
      return EMPTY;
    }
    return this.friendsService.searchUsers(query).pipe(
      tap((results) => {
        this.results.set(results);
        this.searchedQuery.set(query);
      }),
      catchError(() => {
        this.results.set([]);
        this.searchFailed.set(true);
        return EMPTY;
      }),
    );
  }

  private runOptimistically(request$: Observable<unknown>, apply: () => void, undo: () => void) {
    this.actionFailed.set(false);
    apply();
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => {
        undo();
        this.actionFailed.set(true);
      },
    });
  }

  private showFriendship(user: User, incoming: FriendRequest | undefined): void {
    if (incoming) this.dropRequest(incoming);
    this.addFriend(user);
    this.setRelation(user.id, 'FRIENDS');
  }

  private undoFriendship(user: User, incoming: FriendRequest | undefined): void {
    if (incoming) this.restoreRequest(incoming);
    this.dropFriend(user);
    this.setRelation(user.id, 'INCOMING');
  }

  private setRelation(userId: number, relation: FriendRelation): void {
    this.results.update((results) =>
      results.map((result) => (result.id === userId ? { ...result, relation } : result)),
    );
  }

  private addFriend(user: User): void {
    this.friends.update((friends) =>
      friends.some((friend) => friend.id === user.id)
        ? friends
        : [...friends, user].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    );
  }

  private dropFriend(user: User): void {
    this.friends.update((friends) => friends.filter((friend) => friend.id !== user.id));
  }

  private dropRequest(request: FriendRequest): void {
    this.requests.update((requests) => requests.filter((r) => r.id !== request.id));
  }

  private restoreRequest(request: FriendRequest): void {
    this.requests.update((requests) =>
      requests.some((r) => r.id === request.id)
        ? requests
        : [...requests, request].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }
}

function toUser({ id, displayName, avatarUrl, city }: UserSearchResult): User {
  return { id, displayName, avatarUrl, city };
}
