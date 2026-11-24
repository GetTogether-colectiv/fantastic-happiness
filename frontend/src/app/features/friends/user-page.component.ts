import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  forkJoin,
  map,
  merge,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { FriendRelation } from '../../core/models/friend.model';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { FriendsService } from '../../core/services/friends.service';
import { UsersService } from '../../core/services/users.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';

type UserPageState = 'loading' | 'loaded' | 'error';

interface RelationButton {
  label: string;
  icon: string;
  actionable: boolean;
}

const RELATION_BUTTONS: Record<FriendRelation, RelationButton> = {
  NONE: { label: 'Add friend', icon: 'person_add', actionable: true },
  REQUESTED: { label: 'Request sent', icon: 'schedule', actionable: false },
  INCOMING: { label: 'Accept request', icon: 'how_to_reg', actionable: true },
  FRIENDS: { label: 'Friends', icon: 'check', actionable: false },
};

@Component({
  selector: 'app-user-page',
  imports: [MatIconModule, AvatarComponent, ErrorStateComponent, SkeletonCardComponent],
  templateUrl: './user-page.component.html',
  styleUrl: './user-page.component.scss',
})
export class UserPageComponent {
  private readonly usersService = inject(UsersService);
  private readonly friendsService = inject(FriendsService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryRequests = new Subject<void>();
  private readonly userId$ = inject(ActivatedRoute).paramMap.pipe(
    map((params) => Number(params.get('id'))),
  );
  private readonly userId = toSignal(this.userId$, { requireSync: true });

  protected readonly state = signal<UserPageState>('loading');
  protected readonly user = signal<User | null>(null);
  protected readonly relation = signal<FriendRelation | null>(null);
  protected readonly actionFailed = signal(false);
  protected readonly relationButton = computed(() => {
    const relation = this.relation();
    return relation && RELATION_BUTTONS[relation];
  });

  constructor() {
    merge(this.userId$, this.retryRequests.pipe(map(() => this.userId())))
      .pipe(
        switchMap((id) => this.load(id)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected retry(): void {
    this.retryRequests.next();
  }

  protected addFriend(): void {
    const previous = this.relation();
    if (previous !== 'NONE' && previous !== 'INCOMING') return;

    this.actionFailed.set(false);
    this.relation.set(previous === 'INCOMING' ? 'FRIENDS' : 'REQUESTED');
    this.friendsService
      .sendRequest(this.userId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) =>
          this.relation.set(response.status === 'ACCEPTED' ? 'FRIENDS' : 'REQUESTED'),
        error: () => {
          this.relation.set(previous);
          this.actionFailed.set(true);
        },
      });
  }

  private load(id: number) {
    this.state.set('loading');
    this.actionFailed.set(false);
    return forkJoin({
      user: this.usersService.getUser(id),
      relation: this.loadRelation(id),
    }).pipe(
      tap(({ user, relation }) => {
        this.user.set(user);
        this.relation.set(relation);
        this.state.set('loaded');
      }),
      catchError(() => {
        this.state.set('error');
        return EMPTY;
      }),
    );
  }

  private loadRelation(id: number): Observable<FriendRelation | null> {
    if (id === this.auth.currentUser()?.id) return of(null);
    return this.friendsService.getRelation(id).pipe(catchError(() => of(null)));
  }
}
