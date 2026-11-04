import { formatDate } from '@angular/common';
import { Component, ElementRef, LOCALE_ID, computed, inject, input, output, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { DATE_SHORTCUTS, DateRange, DateShortcut, parseIsoDate } from './date-range.utils';

const LABEL_FORMAT = 'd MMM';

@Component({
  selector: 'app-date-range',
  imports: [MatIcon],
  templateUrl: './date-range.component.html',
  styleUrl: './date-range.component.scss',
  host: {
    '(document:click)': 'closeOnOutsideClick($event)',
    '(document:keydown.escape)': 'open.set(false)',
  },
})
export class DateRangeComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly locale = inject(LOCALE_ID);

  readonly from = input<string>();
  readonly to = input<string>();
  readonly rangeChange = output<DateRange>();

  protected readonly shortcuts = DATE_SHORTCUTS;
  protected readonly open = signal(false);
  protected readonly active = computed(() => !!this.from() || !!this.to());
  protected readonly label = computed(() => this.describe(this.from(), this.to()));

  protected applyShortcut(shortcut: DateShortcut): void {
    this.rangeChange.emit(shortcut.range(new Date()));
    this.open.set(false);
  }

  protected select(range: DateRange): void {
    this.rangeChange.emit(range);
  }

  protected clear(): void {
    this.rangeChange.emit({ from: undefined, to: undefined });
    this.open.set(false);
  }

  protected closeOnOutsideClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  private describe(from?: string, to?: string): string {
    const start = this.format(from);
    const end = this.format(to);
    if (start && end) {
      return start === end ? start : `${start} – ${end}`;
    }
    if (start) {
      return `From ${start}`;
    }
    return end ? `Until ${end}` : 'Any date';
  }

  private format(value?: string): string | undefined {
    const date = value ? parseIsoDate(value) : undefined;
    return date ? formatDate(date, LABEL_FORMAT, this.locale) : undefined;
  }
}
