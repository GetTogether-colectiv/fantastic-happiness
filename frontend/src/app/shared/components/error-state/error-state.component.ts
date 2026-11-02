import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  readonly message = input('Something went wrong.');
  readonly retry = output<void>();
}
