import { EventSummary } from '../../core/models/event.model';
import { groupByDay } from './group-by-day';

const LOCALE = 'en-US';
// Saturday, 7 November 2026, 08:00 local time.
const NOW = new Date(2026, 10, 7, 8, 0);

function eventAt(id: number, startsAt: Date): EventSummary {
  return { id, startsAt: startsAt.toISOString() } as EventSummary;
}

describe('groupByDay', () => {
  it('returns no groups for no events', () => {
    expect(groupByDay([], LOCALE, NOW)).toEqual([]);
  });

  it('labels the groups Today, Tomorrow and a formatted date', () => {
    const groups = groupByDay(
      [
        eventAt(1, new Date(2026, 10, 7, 18, 0)),
        eventAt(2, new Date(2026, 10, 8, 10, 0)),
        eventAt(3, new Date(2026, 10, 9, 10, 0)),
      ],
      LOCALE,
      NOW,
    );

    expect(groups.map((group) => group.label)).toEqual(['Today', 'Tomorrow', 'Mon, 9 Nov']);
  });

  it('puts events of the same day in one group and keeps their order', () => {
    const groups = groupByDay(
      [
        eventAt(1, new Date(2026, 10, 9, 9, 0)),
        eventAt(2, new Date(2026, 10, 9, 20, 0)),
        eventAt(3, new Date(2026, 10, 10, 9, 0)),
      ],
      LOCALE,
      NOW,
    );

    expect(groups.map((group) => group.events.map((event) => event.id))).toEqual([[1, 2], [3]]);
  });

  it('uses the local day, so a late evening event is still today', () => {
    const groups = groupByDay([eventAt(1, new Date(2026, 10, 7, 23, 30))], LOCALE, NOW);

    expect(groups[0].label).toBe('Today');
  });
});
