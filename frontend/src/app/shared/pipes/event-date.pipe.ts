import { Pipe, PipeTransform } from '@angular/core';

const LOCALE = 'en-GB';
const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' });
const dayAndMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const time = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function formatStart(date: Date): string {
  return `${weekday.format(date)}, ${dayAndMonth.format(date)} · ${time.format(date)}`;
}

@Pipe({ name: 'eventDate' })
export class EventDatePipe implements PipeTransform {
  transform(start: string, end?: string): string {
    const startDate = new Date(start);
    if (!end) {
      return formatStart(startDate);
    }
    const endDate = new Date(end);
    if (dayAndMonth.format(startDate) === dayAndMonth.format(endDate)) {
      return `${time.format(startDate)} – ${time.format(endDate)}`;
    }
    return `${formatStart(startDate)} – ${formatStart(endDate)}`;
  }
}
