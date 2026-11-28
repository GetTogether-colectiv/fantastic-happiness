import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import {
  ALLOWED_PHOTO_TYPES,
  EventPost,
  INVALID_PHOTO_MESSAGE,
  MAX_PHOTO_SIZE_BYTES,
  MAX_PHOTOS_PER_POST,
  TOO_MANY_PHOTOS_MESSAGE,
} from '../../../../../core/models/post.model';
import { PostsService } from '../../../../../core/services/posts.service';
import { StarRatingComponent } from '../../../../../shared/components/star-rating/star-rating.component';

const MAX_TEXT_LENGTH = 1000;

interface PostFormData {
  eventId: number;
}

interface SelectedPhoto {
  file: File;
  // Local blob: URL used only for the preview; it must be revoked to free the memory.
  previewUrl: string;
}

function isValidPhoto(file: File): boolean {
  return ALLOWED_PHOTO_TYPES.includes(file.type) && file.size > 0 && file.size <= MAX_PHOTO_SIZE_BYTES;
}

@Component({
  selector: 'app-post-form',
  imports: [MatIconModule, ReactiveFormsModule, StarRatingComponent],
  templateUrl: './post-form.component.html',
  styleUrl: './post-form.component.scss',
})
export class PostFormComponent {
  private readonly data = inject<PostFormData>(MAT_BOTTOM_SHEET_DATA);
  private readonly sheetRef = inject(MatBottomSheetRef<PostFormComponent>);
  private readonly posts = inject(PostsService);

  protected readonly maxTextLength = MAX_TEXT_LENGTH;
  protected readonly maxPhotos = MAX_PHOTOS_PER_POST;
  protected readonly acceptedPhotoTypes = ALLOWED_PHOTO_TYPES.join(',');
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly photos = signal<SelectedPhoto[]>([]);
  protected readonly photoError = signal<string | null>(null);
  // Set once the post exists, so a failed photo upload can be retried without creating the post again.
  protected readonly createdPost = signal<EventPost | null>(null);
  protected readonly form = new FormGroup({
    rating: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(5)]),
    text: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(MAX_TEXT_LENGTH)] }),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() =>
      this.photos().forEach((photo) => URL.revokeObjectURL(photo.previewUrl)),
    );
  }

  protected addPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    // Clearing the input lets the user pick the same file again after removing it.
    input.value = '';

    const validFiles = files.filter(isValidPhoto);
    const accepted = validFiles.slice(0, MAX_PHOTOS_PER_POST - this.photos().length);
    if (validFiles.length < files.length) {
      this.photoError.set(INVALID_PHOTO_MESSAGE);
    } else if (accepted.length < validFiles.length) {
      this.photoError.set(TOO_MANY_PHOTOS_MESSAGE);
    } else {
      this.photoError.set(null);
    }
    this.photos.update((photos) => [
      ...photos,
      ...accepted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
  }

  protected removePhoto(photo: SelectedPhoto): void {
    URL.revokeObjectURL(photo.previewUrl);
    this.photos.update((photos) => photos.filter((item) => item !== photo));
    this.photoError.set(null);
  }

  protected cancel(): void {
    const createdPost = this.createdPost();
    if (createdPost) {
      // The post was already published (only its photos failed), so close with it to show it in the list.
      this.sheetRef.dismiss(createdPost);
    } else {
      this.sheetRef.dismiss();
    }
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    const createdPost = this.createdPost();
    if (createdPost) {
      this.uploadPhotosAndClose(createdPost);
      return;
    }
    if (this.form.invalid) {
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
    this.posts.createPost(this.data.eventId, { rating, text: text || null }).subscribe({
      next: (post) => {
        this.createdPost.set(post);
        // Rating and text are saved now; only the photos can still change.
        this.form.disable();
        this.uploadPhotosAndClose(post);
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set("Your post couldn't be published. Please try again.");
      },
    });
  }

  private uploadPhotosAndClose(post: EventPost): void {
    const files = this.photos().map((photo) => photo.file);
    if (files.length === 0) {
      this.submitting.set(false);
      this.sheetRef.dismiss(post);
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.posts.uploadPhotos(post.id, files).subscribe({
      next: (photoUrls) => {
        this.submitting.set(false);
        this.sheetRef.dismiss({ ...post, photoUrls });
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set(
          "Your post was published, but the photos couldn't be uploaded. Please try again.",
        );
      },
    });
  }
}
