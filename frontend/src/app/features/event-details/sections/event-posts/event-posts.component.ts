import { DecimalPipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { EventDetails } from '../../../../core/models/event.model';
import { EventPostsResponse } from '../../../../core/models/post.model';
import { PostsService } from '../../../../core/services/posts.service';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { StarRatingComponent } from '../../../../shared/components/star-rating/star-rating.component';
import { PostCardComponent } from './post-card/post-card.component';

type PostsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; response: EventPostsResponse };

@Component({
  selector: 'app-event-posts',
  imports: [DecimalPipe, ErrorStateComponent, PostCardComponent, StarRatingComponent],
  templateUrl: './event-posts.component.html',
  styleUrl: './event-posts.component.scss',
})
export class EventPostsComponent {
  readonly event = input.required<EventDetails>();
  private readonly posts = inject(PostsService);
  private readonly retryCount = signal(0);

  protected readonly state = signal<PostsState>({ status: 'loading' });

  constructor() {
    effect((onCleanup) => {
      const eventId = this.event().id;
      this.retryCount();
      this.state.set({ status: 'loading' });
      const request = this.posts.getPosts(eventId).subscribe({
        next: (response) => this.state.set({ status: 'loaded', response }),
        error: () => this.state.set({ status: 'error' }),
      });
      onCleanup(() => request.unsubscribe());
    });
  }

  protected retry(): void {
    this.retryCount.update((count) => count + 1);
  }
}
