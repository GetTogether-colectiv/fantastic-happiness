import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let avatar: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(AvatarComponent);
    avatar = fixture.nativeElement;
    fixture.componentRef.setInput('name', '  Élodie Marie Dumont  ');
  });

  it('uses initials when a user has no photo', () => {
    fixture.detectChanges();
    expect(avatar.querySelector('img')).toBeNull();
    expect(avatar.textContent?.trim()).toBe('ÉD');

    fixture.componentRef.setInput('name', 'Alex');
    fixture.detectChanges();
    expect(avatar.textContent?.trim()).toBe('A');
  });

  it('preserves the photo, falls back after an error and tries a new URL', () => {
    fixture.componentRef.setInput('imageUrl', '/photo.jpg');
    fixture.detectChanges();
    const photo = avatar.querySelector('img')!;
    expect(photo.getAttribute('src')).toBe('/photo.jpg');

    photo.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(avatar.querySelector('img')).toBeNull();
    expect(avatar.textContent?.trim()).toBe('ÉD');

    fixture.componentRef.setInput('imageUrl', '/replacement.jpg');
    fixture.detectChanges();
    expect(avatar.querySelector('img')?.getAttribute('src')).toBe('/replacement.jpg');
  });
});
