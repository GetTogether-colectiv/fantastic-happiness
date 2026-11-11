import { Component, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { EMPTY, Subject, catchError, debounceTime, switchMap, tap, timer } from 'rxjs';
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  EVENT_CATEGORIES,
  EventCategory,
} from '../../../core/models/event.model';
import { UsersService } from '../../../core/services/users.service';

type SaveStatus = 'idle' | 'saved' | 'error';

const SAVE_DEBOUNCE_MS = 500;
const SAVED_HINT_MS = 2000;

@Component({
  selector: 'app-category-picker',
  imports: [MatIcon],
  templateUrl: './category-picker.component.html',
  styleUrl: './category-picker.component.scss',
})
export class CategoryPickerComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly changes = new Subject<EventCategory[]>();
  private lastSaved: EventCategory[] = [];

  /** The saved choice. It is read once, when the picker is created; after that the picker owns the selection. */
  readonly initial = input.required<EventCategory[]>();

  protected readonly categories = EVENT_CATEGORIES;
  protected readonly icons = CATEGORY_ICONS;
  protected readonly labels = CATEGORY_LABELS;
  protected readonly selection = signal<EventCategory[]>([]);
  protected readonly status = signal<SaveStatus>('idle');

  constructor() {
    // Rapid taps collapse into one request, and a newer change cancels one still in flight.
    this.changes
      .pipe(
        debounceTime(SAVE_DEBOUNCE_MS),
        switchMap((categories) => this.save(categories)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.selection.set(this.initial());
    this.lastSaved = this.initial();
  }

  protected isSelected(category: EventCategory): boolean {
    return this.selection().includes(category);
  }

  protected toggle(category: EventCategory): void {
    const current = this.selection();
    if (!this.isSelected(category)) {
      this.select([...current, category]);
    } else if (current.length > 1) {
      this.select(current.filter((selected) => selected !== category));
    }
    // The last selected category cannot be removed: at least one must stay selected.
  }

  private select(categories: EventCategory[]): void {
    this.selection.set(categories);
    this.status.set('idle');
    this.changes.next(categories);
  }

  private save(categories: EventCategory[]) {
    return this.usersService.updatePreferences(categories).pipe(
      tap(() => {
        this.lastSaved = categories;
        this.status.set('saved');
      }),
      switchMap(() => timer(SAVED_HINT_MS)),
      tap(() => this.status.set('idle')),
      catchError(() => {
        this.selection.set(this.lastSaved);
        this.status.set('error');
        return EMPTY;
      }),
    );
  }
}
