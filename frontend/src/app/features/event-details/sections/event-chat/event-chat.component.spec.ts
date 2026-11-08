import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EventDetails } from '../../../../core/models/event.model';
import { EventChatComponent } from './event-chat.component';

const EVENT: EventDetails = {
  id: 7,
  title: 'Evening concert',
  category: 'MUSIC',
  startsAt: '2026-11-10T18:00:00Z',
  endsAt: '2026-11-10T20:00:00Z',
  city: 'Cluj-Napoca',
  locationName: 'Central Park',
  latitude: null,
  longitude: null,
  imageUrl: null,
  capacity: 30,
  goingCount: 1,
  description: null,
  organizerId: 3,
  createdAt: '2026-11-01T12:00:00Z',
};

const COUNT_URL = '/api/events/7/messages/count';

describe('EventChatComponent', () => {
  let fixture: ComponentFixture<EventChatComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EventChatComponent);
    fixture.componentRef.setInput('event', EVENT);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('links participants to the chat and shows the message count', () => {
    http.expectOne(COUNT_URL).flush(12);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a.chat-row');
    expect(link.getAttribute('href')).toBe('/events/7/chat');
    expect(link.textContent).toContain('Group chat');
    expect(link.textContent).toContain('12');
  });

  it('shows a disabled row to users who are not going', () => {
    http.expectOne(COUNT_URL).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Join the event to chat');
  });

  it('reloads the count after the participation changes', () => {
    http.expectOne(COUNT_URL).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.componentInstance.refresh();
    http.expectOne(COUNT_URL).flush(0);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a.chat-row')).not.toBeNull();
  });
});
