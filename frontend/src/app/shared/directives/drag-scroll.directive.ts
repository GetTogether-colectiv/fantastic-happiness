import { Directive, ElementRef, inject } from '@angular/core';

const DRAG_THRESHOLD_PX = 5;

/** Lets a mouse drag scroll a horizontally overflowing element. Touch already scrolls natively. */
@Directive({
  selector: '[appDragScroll]',
  host: {
    '(pointerdown)': 'startDrag($event)',
    '(document:pointermove)': 'drag($event)',
    '(document:pointerup)': 'endDrag()',
  },
})
export class DragScrollDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private pressed = false;
  private dragged = false;
  private startX = 0;
  private startScrollLeft = 0;

  constructor() {
    // Capture phase, so releasing a drag over a chip does not also select it.
    this.element.addEventListener(
      'click',
      (event) => {
        if (this.dragged) {
          event.stopPropagation();
          event.preventDefault();
        }
      },
      true,
    );
  }

  protected startDrag(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') {
      return;
    }
    this.pressed = true;
    this.dragged = false;
    this.startX = event.clientX;
    this.startScrollLeft = this.element.scrollLeft;
  }

  protected drag(event: PointerEvent): void {
    if (!this.pressed) {
      return;
    }
    const distance = event.clientX - this.startX;
    this.dragged ||= Math.abs(distance) > DRAG_THRESHOLD_PX;
    if (this.dragged) {
      this.element.scrollLeft = this.startScrollLeft - distance;
    }
  }

  protected endDrag(): void {
    this.pressed = false;
  }
}
