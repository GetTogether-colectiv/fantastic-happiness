import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
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
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StarRatingComponent),
      multi: true,
    },
  ],
})
export class StarRatingComponent implements ControlValueAccessor {
  readonly rating = input(0);
  readonly label = input<string>();
  readonly inputMode = input(false);

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly controlValue = signal<number | null>(null);
  protected readonly disabled = signal(false);
  protected readonly safeRating = computed(() =>
    Math.min(
      MAX_RATING,
      Math.max(MIN_RATING, this.inputMode() ? (this.controlValue() ?? 0) : this.rating()),
    ),
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

  protected select(position: number): void {
    if (!this.inputMode() || this.disabled()) {
      return;
    }
    this.controlValue.set(position);
    this.onChange(position);
    this.onTouched();
  }

  writeValue(value: number | null): void {
    this.controlValue.set(value);
  }

  registerOnChange(change: (value: number) => void): void {
    this.onChange = change;
  }

  registerOnTouched(touched: () => void): void {
    this.onTouched = touched;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  private onChange: (value: number) => void = () => undefined;
  private onTouched: () => void = () => undefined;
}
