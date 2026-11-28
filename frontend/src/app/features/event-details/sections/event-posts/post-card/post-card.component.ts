import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EventPost } from '../../../../../core/models/post.model';
import { AvatarComponent } from '../../../../../shared/components/avatar/avatar.component';
import { StarRatingComponent } from '../../../../../shared/components/star-rating/star-rating.component';
import { PhotoViewerComponent, PhotoViewerData } from '../photo-viewer/photo-viewer.component';

@Component({
  selector: 'app-post-card',
  imports: [AvatarComponent, DatePipe, StarRatingComponent],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  readonly post = input.required<EventPost>();
  private readonly dialog = inject(MatDialog);

  protected openPhoto(index: number): void {
    this.dialog.open<PhotoViewerComponent, PhotoViewerData>(PhotoViewerComponent, {
      data: { photoUrls: this.post().photoUrls, startIndex: index },
      ariaLabel: `Photos by ${this.post().authorName}`,
      width: '100vw',
      height: '100dvh',
      maxWidth: '100vw',
      maxHeight: '100dvh',
      panelClass: 'photo-viewer-panel',
    });
  }
}
