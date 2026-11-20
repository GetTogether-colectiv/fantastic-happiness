import { FormControl, FormGroup } from '@angular/forms';
import { passwordMatchValidator, passwordRequirementsValidator } from './auth.validators';

describe('passwordMatchValidator', () => {
  it('leaves the required check to the controls and flags a differing confirmation', () => {
    const group = new FormGroup(
      { password: new FormControl('password1'), confirmPassword: new FormControl('') },
      { validators: passwordMatchValidator() },
    );

    expect(group.errors).toBeNull();
    group.controls.confirmPassword.setValue('password2');
    expect(group.errors).toEqual({ passwordMismatch: true });
    group.controls.confirmPassword.setValue('password1');
    expect(group.errors).toBeNull();
  });
});

describe('passwordRequirementsValidator', () => {
  it.each([
    ['Aa1!😀bc', 'Use at least 8 characters.'],
    ['abcdef1!', 'Add an uppercase letter.'],
    ['ABCDEF1!', 'Add a lowercase letter.'],
    ['Abcdefg!', 'Add a digit.'],
    ['Abcdef1\u00a0', 'Add a special character.'],
    ['Aa1!abcd\ud800', 'Remove invalid characters.'],
  ])('rejects %s with a specific message', (password, message) => {
    expect(passwordRequirementsValidator(new FormControl(password))).toEqual({
      passwordRequirements: message,
    });
  });

  it.each(['Abc!def1', 'Åé中١😀漢字文'])('accepts %s', (password) => {
    expect(passwordRequirementsValidator(new FormControl(password))).toBeNull();
  });

  it('allows a multibyte password at the BCrypt limit and rejects one byte more', () => {
    const password = 'é'.repeat(34) + 'Aa1!';
    expect(passwordRequirementsValidator(new FormControl(password))).toBeNull();
    expect(passwordRequirementsValidator(new FormControl(password + 'x'))).toEqual({
      passwordRequirements: 'Password is too long',
    });
  });
});
