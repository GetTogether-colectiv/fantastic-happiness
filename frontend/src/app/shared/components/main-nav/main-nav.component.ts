import { Component, ElementRef, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-main-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './main-nav.component.html',
  styleUrl: './main-nav.component.scss',
  host: {
    '(document:click)': 'closeOnOutsideClick($event)',
    '(document:keydown.escape)': 'close()',
  },
})
export class MainNavComponent {
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly menuOpen = signal(false);

  protected toggle(): void {
    this.menuOpen.update((isOpen) => !isOpen);
  }

  protected close(): void {
    this.menuOpen.set(false);
  }

  protected closeOnOutsideClick(event: MouseEvent): void {
    if (!this.hostElement.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
