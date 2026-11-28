import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { PostFormComponent } from './post-form.component';

describe('PostFormComponent', () => {
  const sheetRef = { dismiss: vi.fn() };
  let http: HttpTestingController;

  beforeEach(() => {
    sheetRef.dismiss.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_BOTTOM_SHEET_DATA, useValue: { eventId: 7 } },
        { provide: MatBottomSheetRef, useValue: sheetRef },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requires a rating and publishes trimmed text', () => {
    const fixture = TestBed.createComponent(PostFormComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const publish = root.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(publish.disabled).toBe(true);

    root.querySelectorAll<HTMLButtonElement>('app-star-rating button')[3].click();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea')!;
    textarea.value = '  Loved it  ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.textContent).toContain('12/1000');
    expect(publish.disabled).toBe(false);

    publish.click();
    const request = http.expectOne('/api/events/7/posts');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ rating: 4, text: 'Loved it' });
    const created = {
      id: 12,
      userId: 1,
      eventId: 7,
      authorName: 'Alexandra Pop',
      authorAvatar: null,
      rating: 4,
      text: 'Loved it',
      createdAt: '2026-11-23T12:00:00Z',
      commentCount: 0,
    };
    request.flush(created);
    expect(sheetRef.dismiss).toHaveBeenCalledWith(created);
  });

  it('enforces the 1000 character textarea limit and can be cancelled', () => {
    const fixture = TestBed.createComponent(PostFormComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('textarea')?.getAttribute('maxlength')).toBe('1000');
    root.querySelector<HTMLButtonElement>('button.secondary')!.click();
    expect(sheetRef.dismiss).toHaveBeenCalledWith();
  });
});
