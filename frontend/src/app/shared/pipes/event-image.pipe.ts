import { Pipe, PipeTransform } from '@angular/core';

export const DEFAULT_EVENT_IMAGE_URL = '/images/event-placeholder.png';

@Pipe({ name: 'eventImage' })
export class EventImagePipe implements PipeTransform {
  transform(imageUrl: string | null | undefined): string {
    return imageUrl?.trim() ? imageUrl : DEFAULT_EVENT_IMAGE_URL;
  }
}
