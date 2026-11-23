import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { StarRatingComponent } from './star-rating.component';

@Component({
  imports: [ReactiveFormsModule, StarRatingComponent],
  template: '<app-star-rating [inputMode]="true" [formControl]="rating" />',
})
class InputRatingHostComponent {
  readonly rating = new FormControl<number | null>(null);
}

describe('StarRatingComponent', () => {
  it('renders five accessible stars including a half star for a decimal rating', () => {
    const fixture = TestBed.createComponent(StarRatingComponent);
    fixture.componentRef.setInput('rating', 4.3);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect([...root.querySelectorAll('mat-icon')].map((icon) => icon.textContent?.trim())).toEqual([
      'star',
      'star',
      'star',
      'star',
      'star_half',
    ]);
    expect(root.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      '4.3 out of 5 stars',
    );
  });

  it('clamps ratings to the supported range', () => {
    const fixture = TestBed.createComponent(StarRatingComponent);
    fixture.componentRef.setInput('rating', 8);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="img"]').getAttribute('aria-label')).toBe(
      '5 out of 5 stars',
    );
  });

  it('acts as a form control in input mode', () => {
    const fixture = TestBed.createComponent(InputRatingHostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('button');

    buttons[3].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.rating.value).toBe(4);
    expect(buttons[3].getAttribute('aria-pressed')).toBe('true');
    fixture.componentInstance.rating.disable();
    fixture.detectChanges();
    expect(buttons[0].disabled).toBe(true);
  });
});
