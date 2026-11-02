import { EventDatePipe } from './event-date.pipe';

describe('EventDatePipe', () => {
  const pipe = new EventDatePipe();
  const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0).toISOString();

  it('formats a start time', () => {
    expect(pipe.transform(at(8, 19))).toBe('Sun, 8 Nov · 19:00');
  });

  it('formats a range on the same day as times only', () => {
    expect(pipe.transform(at(8, 19), at(8, 23))).toBe('19:00 – 23:00');
  });

  it('formats a range over several days with both dates', () => {
    expect(pipe.transform(at(8, 19), at(9, 2))).toBe('Sun, 8 Nov · 19:00 – Mon, 9 Nov · 02:00');
  });
});
