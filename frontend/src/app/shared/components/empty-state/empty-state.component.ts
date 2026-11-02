import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly icon = input('🔍');
  readonly title = input.required<string>();
  readonly text = input<string>();
  readonly actionLabel = input<string>();
  readonly action = output<void>();
}
