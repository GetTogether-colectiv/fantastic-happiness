import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EventSummary } from '../../../core/models/event.model';
import { DEFAULT_EVENT_IMAGE_URL } from '../../pipes/event-image.pipe';
import { EventCardComponent } from './event-card.component';

const EVENT: EventSummary = {
  id: 7,
  title: 'Evening concert',
  category: 'MUSIC',
  startsAt: '2999-01-01T18:00:00Z',
  endsAt: '2999-01-01T20:00:00Z',
  city: 'Cluj-Napoca',
  locationName: 'Central Park',
  latitude: null,
  longitude: null,
  imageUrl: null,
  capacity: null,
  goingCount: 0,
};

describe('EventCardComponent', () => {
  function imageSource(imageUrl: string | null): string | null | undefined {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(EventCardComponent);
    fixture.componentRef.setInput('event', { ...EVENT, imageUrl });
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('img')?.getAttribute('src');
  }

  it('shows the image of the event', () => {
    expect(imageSource('/concert.jpg')).toBe('/concert.jpg');
  });

  it('shows the default image when the event has none', () => {
    expect(imageSource(null)).toBe(DEFAULT_EVENT_IMAGE_URL);
  });
});
