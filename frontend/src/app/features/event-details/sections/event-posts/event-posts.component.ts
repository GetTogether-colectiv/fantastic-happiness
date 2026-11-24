import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { EventDetails } from '../../../../core/models/event.model';
import { EventPost, EventPostsResponse } from '../../../../core/models/post.model';
import { ParticipationStatus } from '../../../../core/models/participation.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ParticipationService } from '../../../../core/services/participation.service';
import { PostsService } from '../../../../core/services/posts.service';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { StarRatingComponent } from '../../../../shared/components/star-rating/star-rating.component';
import { PostCardComponent } from './post-card/post-card.component';
import { PostFormComponent } from './post-form/post-form.component';

type PostsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; response: EventPostsResponse };

@Component({
  selector: 'app-event-posts',
  imports: [
    DecimalPipe,
    ErrorStateComponent,
    MatBottomSheetModule,
    PostCardComponent,
    StarRatingComponent,
  ],
  templateUrl: './event-posts.component.html',
  styleUrl: './event-posts.component.scss',
})
export class EventPostsComponent {
  readonly event = input.required<EventDetails>();
  private readonly posts = inject(PostsService);
  private readonly participation = inject(ParticipationService);
  private readonly auth = inject(AuthService);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly retryCount = signal(0);
  private readonly participationStatus = signal<ParticipationStatus | null>(null);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly autoOpenedFor = signal<number | null>(null);
  private sheetOpen = false;

  protected readonly state = signal<PostsState>({ status: 'loading' });
  protected readonly canWrite = computed(() => {
    const currentUserId = this.auth.currentUser()?.id;
    const state = this.state();
    return (
      currentUserId !== undefined &&
      this.participationStatus() === 'GOING' &&
      state.status === 'loaded' &&
      !state.response.posts.some((post) => post.userId === currentUserId)
    );
  });

  constructor() {
    effect((onCleanup) => {
      const eventId = this.event().id;
      this.retryCount();
      this.state.set({ status: 'loading' });
      this.participationStatus.set(null);
      const postsRequest = this.posts.getPosts(eventId).subscribe({
        next: (response) => this.state.set({ status: 'loaded', response }),
        error: () => this.state.set({ status: 'error' }),
      });
      const participationRequest = this.participation.getParticipation(eventId).subscribe({
        next: (response) => this.participationStatus.set(response.status),
        error: () => this.participationStatus.set(null),
      });
      onCleanup(() => {
        postsRequest.unsubscribe();
        participationRequest.unsubscribe();
      });
    });

    effect(() => {
      const eventId = this.event().id;
      if (
        this.queryParams().get('write') === '1' &&
        this.canWrite() &&
        this.autoOpenedFor() !== eventId
      ) {
        this.autoOpenedFor.set(eventId);
        this.openForm(true);
      }
    });
  }

  protected retry(): void {
    this.retryCount.update((count) => count + 1);
  }

  protected openForm(fromQueryParam = false): void {
    if (!this.canWrite() || this.sheetOpen) {
      return;
    }
    this.sheetOpen = true;
    if (fromQueryParam) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { write: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    this.bottomSheet
      .open<PostFormComponent, { eventId: number }, EventPost>(PostFormComponent, {
        data: { eventId: this.event().id },
        panelClass: 'post-form-sheet',
      })
      .afterDismissed()
      .pipe(take(1))
      .subscribe((post) => {
        this.sheetOpen = false;
        if (post) {
          this.prepend(post);
        }
      });
  }

  private prepend(post: EventPost): void {
    this.state.update((state) => {
      if (state.status !== 'loaded' || state.response.posts.some((item) => item.id === post.id)) {
        return state;
      }
      const posts = [post, ...state.response.posts];
      const averageRating =
        Math.round((posts.reduce((sum, item) => sum + item.rating, 0) / posts.length) * 10) / 10;
      return {
        status: 'loaded',
        response: { averageRating, count: posts.length, posts },
      };
    });
  }
}
