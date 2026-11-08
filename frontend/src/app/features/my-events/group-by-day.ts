import { formatDate } from '@angular/common';
import { EventSummary } from '../../core/models/event.model';
import { toIsoDate } from '../discover/date-range/date-range.utils';

export interface DayGroup {
  key: string;
  label: string;
  events: EventSummary[];
}

const DATE_LABEL_FORMAT = 'EEE, d MMM';

export function groupByDay(events: EventSummary[], locale: string, now = new Date()): DayGroup[] {
  const today = toIsoDate(now);
  const tomorrow = toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const groups: DayGroup[] = [];

  for (const event of events) {
    const startsAt = new Date(event.startsAt);
    const key = toIsoDate(startsAt);
    let group = groups.at(-1);
    if (group?.key !== key) {
      const label =
        key === today
          ? 'Today'
          : key === tomorrow
            ? 'Tomorrow'
            : formatDate(startsAt, DATE_LABEL_FORMAT, locale);
      group = { key, label, events: [] };
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}
