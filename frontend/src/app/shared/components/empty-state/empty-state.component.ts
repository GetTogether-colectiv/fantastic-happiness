import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly icon = input('search');
  readonly title = input.required<string>();
  readonly text = input<string>();
  readonly actionLabel = input<string>();
  readonly action = output<void>();
}
