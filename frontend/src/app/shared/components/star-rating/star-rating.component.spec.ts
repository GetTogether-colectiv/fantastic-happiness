import { TestBed } from '@angular/core/testing';
import { StarRatingComponent } from './star-rating.component';

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
});
