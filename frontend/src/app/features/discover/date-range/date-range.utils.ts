/** A missing bound must be present as `undefined`, so that the URL update removes it instead of keeping the old one. */
export interface DateRange {
  from?: string;
  to?: string;
}

export interface DateShortcut {
  label: string;
  range: (today: Date) => DateRange;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SUNDAY = 0;
const SATURDAY = 6;
const NEXT_DAYS_COUNT = 7;

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Formats a date as yyyy-MM-dd in the local time zone, which `toISOString` would shift to UTC. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Returns the local midnight of a yyyy-MM-dd string, or undefined when it is not a real calendar date. */
export function parseIsoDate(value: string): Date | undefined {
  if (!ISO_DATE_PATTERN.test(value)) {
    return undefined;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return toIsoDate(date) === value ? date : undefined;
}

export function endOfDay(date: Date): Date {
  return new Date(addDays(date, 1).getTime() - 1);
}

export const DATE_SHORTCUTS: DateShortcut[] = [
  {
    label: 'Today',
    range: (today) => ({ from: toIsoDate(today), to: toIsoDate(today) }),
  },
  {
    label: 'This weekend',
    range: (today) => {
      const weekday = today.getDay();
      if (weekday === SUNDAY) {
        return { from: toIsoDate(today), to: toIsoDate(today) };
      }
      const saturday = addDays(today, SATURDAY - weekday);
      const firstDay = weekday === SATURDAY ? today : saturday;
      return { from: toIsoDate(firstDay), to: toIsoDate(addDays(saturday, 1)) };
    },
  },
  {
    label: 'Next 7 days',
    range: (today) => ({
      from: toIsoDate(today),
      to: toIsoDate(addDays(today, NEXT_DAYS_COUNT - 1)),
    }),
  },
];
