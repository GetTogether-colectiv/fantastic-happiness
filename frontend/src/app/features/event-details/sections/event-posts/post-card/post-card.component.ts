import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { EventPost } from '../../../../../core/models/post.model';
import { AvatarComponent } from '../../../../../shared/components/avatar/avatar.component';
import { StarRatingComponent } from '../../../../../shared/components/star-rating/star-rating.component';

@Component({
  selector: 'app-post-card',
  imports: [AvatarComponent, DatePipe, StarRatingComponent],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  readonly post = input.required<EventPost>();
}
