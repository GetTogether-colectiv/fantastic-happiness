import { DEFAULT_EVENT_IMAGE_URL, EventImagePipe } from './event-image.pipe';

describe('EventImagePipe', () => {
  const pipe = new EventImagePipe();

  it('keeps the image of the event', () => {
    expect(pipe.transform('/concert.jpg')).toBe('/concert.jpg');
  });

  it('falls back to the default image when there is none', () => {
    expect(pipe.transform(null)).toBe(DEFAULT_EVENT_IMAGE_URL);
    expect(pipe.transform(undefined)).toBe(DEFAULT_EVENT_IMAGE_URL);
    expect(pipe.transform('')).toBe(DEFAULT_EVENT_IMAGE_URL);
    expect(pipe.transform('   ')).toBe(DEFAULT_EVENT_IMAGE_URL);
  });
});
