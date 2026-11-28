import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

// How far a finger must move sideways before it counts as a swipe, not a tap.
const SWIPE_THRESHOLD_PX = 50;

export interface PhotoViewerData {
  photoUrls: string[];
  startIndex: number;
}

/** Opened with MatDialog, which already closes it on Escape and keeps keyboard focus inside it. */
@Component({
  selector: 'app-photo-viewer',
  templateUrl: './photo-viewer.component.html',
  styleUrl: './photo-viewer.component.scss',
  host: {
    '(document:keydown.arrowleft)': 'previous()',
    '(document:keydown.arrowright)': 'next()',
    '(touchstart)': 'startSwipe($event)',
    '(touchend)': 'endSwipe($event)',
  },
})
export class PhotoViewerComponent {
  private readonly data = inject<PhotoViewerData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PhotoViewerComponent>);
  private swipeStartX: number | null = null;

  protected readonly photoUrls = this.data.photoUrls;
  protected readonly index = signal(this.data.startIndex);
  protected readonly currentUrl = computed(() => this.photoUrls[this.index()]);
  protected readonly hasPrevious = computed(() => this.index() > 0);
  protected readonly hasNext = computed(() => this.index() < this.photoUrls.length - 1);

  protected previous(): void {
    if (this.hasPrevious()) {
      this.index.update((index) => index - 1);
    }
  }

  protected next(): void {
    if (this.hasNext()) {
      this.index.update((index) => index + 1);
    }
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected startSwipe(event: TouchEvent): void {
    this.swipeStartX = event.changedTouches[0].clientX;
  }

  protected endSwipe(event: TouchEvent): void {
    if (this.swipeStartX === null) {
      return;
    }
    const distance = event.changedTouches[0].clientX - this.swipeStartX;
    this.swipeStartX = null;
    if (distance > SWIPE_THRESHOLD_PX) {
      this.previous();
    } else if (distance < -SWIPE_THRESHOLD_PX) {
      this.next();
    }
  }
}
