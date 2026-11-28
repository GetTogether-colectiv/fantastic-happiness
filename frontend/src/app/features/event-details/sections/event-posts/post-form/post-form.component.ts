import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { finalize } from 'rxjs';
import { PostsService } from '../../../../../core/services/posts.service';
import { StarRatingComponent } from '../../../../../shared/components/star-rating/star-rating.component';

const MAX_TEXT_LENGTH = 1000;

interface PostFormData {
  eventId: number;
}

@Component({
  selector: 'app-post-form',
  imports: [ReactiveFormsModule, StarRatingComponent],
  templateUrl: './post-form.component.html',
  styleUrl: './post-form.component.scss',
})
export class PostFormComponent {
  private readonly data = inject<PostFormData>(MAT_BOTTOM_SHEET_DATA);
  private readonly sheetRef = inject(MatBottomSheetRef<PostFormComponent>);
  private readonly posts = inject(PostsService);

  protected readonly maxTextLength = MAX_TEXT_LENGTH;
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly form = new FormGroup({
    rating: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(5)]),
    text: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(MAX_TEXT_LENGTH)] }),
  });

  protected cancel(): void {
    this.sheetRef.dismiss();
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const rating = this.form.controls.rating.value;
    if (rating === null) {
      return;
    }
    const text = this.form.controls.text.value.trim();
    this.submitting.set(true);
    this.submitError.set(null);
    this.posts
      .createPost(this.data.eventId, { rating, text: text || null })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (post) => this.sheetRef.dismiss(post),
        error: () => this.submitError.set("Your post couldn't be published. Please try again."),
      });
  }
}
