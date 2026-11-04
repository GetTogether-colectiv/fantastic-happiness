import { ParamMap } from '@angular/router';
import { EVENT_CATEGORIES, EventCategory, EventFilter } from '../../core/models/event.model';
import { endOfDay, parseIsoDate } from './date-range/date-range.utils';

export interface DiscoverFilter {
  category?: EventCategory;
  from?: string;
  to?: string;
}

export function parseDiscoverFilter(params: ParamMap): DiscoverFilter {
  const from = params.get('from');
  const to = params.get('to');
  return {
    category: EVENT_CATEGORIES.find((category) => category === params.get('category')),
    from: from && parseIsoDate(from) ? from : undefined,
    to: to && parseIsoDate(to) ? to : undefined,
  };
}

/** The URL holds whole local days, while the API compares instants, so `to` runs until the end of its day. */
export function toEventFilter({ category, from, to }: DiscoverFilter): EventFilter {
  const fromDate = from ? parseIsoDate(from) : undefined;
  const toDate = to ? parseIsoDate(to) : undefined;
  return {
    category,
    from: fromDate?.toISOString(),
    to: toDate ? endOfDay(toDate).toISOString() : undefined,
  };
}
