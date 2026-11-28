import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  const pipe = new TimeAgoPipe();
  const now = new Date('2026-11-28T12:00:00Z').getTime();
  const ago = (seconds: number) => new Date(now - seconds * 1_000).toISOString();

  it('says "just now" for less than a minute', () => {
    expect(pipe.transform(ago(30), now)).toBe('just now');
  });

  it('counts minutes', () => {
    expect(pipe.transform(ago(5 * 60), now)).toBe('5m ago');
  });

  it('counts hours', () => {
    expect(pipe.transform(ago(2 * 3_600), now)).toBe('2h ago');
  });

  it('counts days', () => {
    expect(pipe.transform(ago(3 * 86_400), now)).toBe('3d ago');
  });

  it('falls back to the date after a week', () => {
    expect(pipe.transform(ago(10 * 86_400), now)).toBe('18 Nov 2026');
  });

  it('treats a time slightly in the future as just now', () => {
    expect(pipe.transform(ago(-5), now)).toBe('just now');
  });
});
