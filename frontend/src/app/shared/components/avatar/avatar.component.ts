import { Component, computed, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
  host: { 'aria-hidden': 'true' },
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly imageUrl = input<string | null>(null);

  protected readonly source = computed(() => this.imageUrl()?.trim());
  protected readonly imageFailed = linkedSignal({ source: this.source, computation: () => false });
  protected readonly initials = computed(() => {
    const words = this.name().trim().split(/\s+/);
    const first = Array.from(words[0].toUpperCase())[0] ?? '';
    const last = words.length > 1 ? Array.from(words[words.length - 1].toUpperCase())[0] : '';
    return first + last;
  });
}
