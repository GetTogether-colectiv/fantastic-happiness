import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

const MIN_RATING = 0;
const MAX_RATING = 5;
const FULL_STAR_THRESHOLD = 0.75;
const HALF_STAR_THRESHOLD = 0.25;

@Component({
  selector: 'app-star-rating',
  imports: [MatIconModule],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
})
export class StarRatingComponent {
  readonly rating = input.required<number>();
  readonly label = input<string>();

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly safeRating = computed(() =>
    Math.min(MAX_RATING, Math.max(MIN_RATING, this.rating())),
  );
  protected readonly accessibleLabel = computed(
    () => this.label() ?? `${this.safeRating()} out of ${MAX_RATING} stars`,
  );

  protected iconFor(position: number): string {
    const fill = this.safeRating() - (position - 1);
    if (fill >= FULL_STAR_THRESHOLD) {
      return 'star';
    }
    if (fill >= HALF_STAR_THRESHOLD) {
      return 'star_half';
    }
    return 'star_border';
  }
}
