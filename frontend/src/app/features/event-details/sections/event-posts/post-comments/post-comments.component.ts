import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { PostComment } from '../../../../../core/models/post.model';
import { AuthService } from '../../../../../core/services/auth.service';
import { PostsService } from '../../../../../core/services/posts.service';
import { AvatarComponent } from '../../../../../shared/components/avatar/avatar.component';
import { ErrorStateComponent } from '../../../../../shared/components/error-state/error-state.component';
import { TimeAgoPipe } from '../../../../../shared/pipes/time-ago.pipe';

const MAX_COMMENT_LENGTH = 500;

type CommentsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; comments: PostComment[] };

@Component({
  selector: 'app-post-comments',
  imports: [AvatarComponent, ErrorStateComponent, MatIconModule, ReactiveFormsModule, TimeAgoPipe],
  templateUrl: './post-comments.component.html',
  styleUrl: './post-comments.component.scss',
})
export class PostCommentsComponent implements OnInit {
  readonly postId = input.required<number>();
  readonly countChange = output<number>();

  private readonly posts = inject(PostsService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxLength = MAX_COMMENT_LENGTH;
  protected readonly text = new FormControl('', { nonNullable: true });
  protected readonly state = signal<CommentsState>({ status: 'loading' });
  protected readonly sending = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly currentUserId = computed(() => this.auth.currentUser()?.id);

  private readonly draft = toSignal(this.text.valueChanges, { initialValue: '' });
  protected readonly canSend = computed(() => !this.sending() && this.draft().trim().length > 0);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.posts
      .getComments(this.postId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comments) => this.show(comments),
        error: () => this.state.set({ status: 'error' }),
      });
  }

  protected send(event: SubmitEvent): void {
    event.preventDefault();
    const text = this.text.value.trim();
    if (!this.canSend()) {
      return;
    }

    this.sending.set(true);
    this.failure.set(null);
    this.posts
      .createComment(this.postId(), { text })
      .pipe(
        finalize(() => this.sending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (comment) => {
          this.text.reset();
          this.show([...this.comments(), comment]);
        },
        error: () => this.failure.set("Your comment couldn't be sent. Please try again."),
      });
  }

  protected remove(comment: PostComment): void {
    this.failure.set(null);
    this.posts
      .deleteComment(comment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.show(this.comments().filter((item) => item.id !== comment.id)),
        error: () => this.failure.set("The comment couldn't be deleted. Please try again."),
      });
  }

  private comments(): PostComment[] {
    const state = this.state();
    return state.status === 'loaded' ? state.comments : [];
  }

  private show(comments: PostComment[]): void {
    this.state.set({ status: 'loaded', comments });
    this.countChange.emit(comments.length);
  }
}
