import { Pipe, PipeTransform } from '@angular/core';

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const MS_PER_SECOND = 1_000;
const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string, now: number = Date.now()): string {
    const then = new Date(value);
    const seconds = Math.floor((now - then.getTime()) / MS_PER_SECOND);
    if (seconds < SECONDS_PER_MINUTE) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
    if (minutes < MINUTES_PER_HOUR) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / MINUTES_PER_HOUR);
    if (hours < HOURS_PER_DAY) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / HOURS_PER_DAY);
    return days < DAYS_PER_WEEK ? `${days}d ago` : date.format(then);
  }
}
