import { Component, input, output } from '@angular/core';
import { EVENT_CATEGORIES, EventCategory } from '../../../core/models/event.model';
import { DragScrollDirective } from '../../directives/drag-scroll.directive';
import { CategoryChipComponent } from '../category-chip/category-chip.component';

@Component({
  selector: 'app-category-filter',
  imports: [CategoryChipComponent, DragScrollDirective],
  templateUrl: './category-filter.component.html',
  styleUrl: './category-filter.component.scss',
})
export class CategoryFilterComponent {
  readonly selected = input<EventCategory | undefined>();
  readonly selectedChange = output<EventCategory | undefined>();

  protected readonly categories = EVENT_CATEGORIES;

  protected select(category: EventCategory | undefined): void {
    this.selectedChange.emit(this.selected() === category ? undefined : category);
  }
}
