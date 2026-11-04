import { Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { CATEGORY_ICONS, CATEGORY_LABELS, EventCategory } from '../../../core/models/event.model';

@Component({
  selector: 'app-category-chip',
  imports: [MatIcon],
  templateUrl: './category-chip.component.html',
  styleUrl: './category-chip.component.scss',
})
export class CategoryChipComponent {
  readonly category = input.required<EventCategory>();
  readonly selected = input(false);

  protected readonly label = computed(() => CATEGORY_LABELS[this.category()]);
  protected readonly icon = computed(() => CATEGORY_ICONS[this.category()]);
  protected readonly color = computed(() => `var(--category-${this.category().toLowerCase()})`);
}
