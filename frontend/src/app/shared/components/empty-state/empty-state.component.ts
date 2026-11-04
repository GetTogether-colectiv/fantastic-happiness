import { Component, input, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  imports: [MatIcon],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly icon = input('search_off');
  readonly title = input.required<string>();
  readonly text = input<string>();
  readonly actionLabel = input<string>();
  readonly action = output<void>();
}
