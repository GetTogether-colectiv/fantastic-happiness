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
    ['abcdef1!', 'Add an uppercase letter (A–Z).'],
    ['ABCDEF1!', 'Add a lowercase letter (a–z).'],
    ['Abcdefg!', 'Add a digit (0–9).'],
    ['Abcdef1\u00a0', 'Add a special character such as !, @, or #.'],
    ['Àbcdef1!', 'Add an uppercase letter (A–Z).'],
    ['ABCDÉF1!', 'Add a lowercase letter (a–z).'],
    ['Abcdef١!', 'Add a digit (0–9).'],
    ['Abcdef1🫩', 'Add a special character such as !, @, or #.'],
    ['Aa1!abcd\ud800', 'Remove invalid characters.'],
  ])('rejects %s with a specific message', (password, message) => {
    expect(passwordRequirementsValidator(new FormControl(password))).toEqual({
      passwordRequirements: message,
    });
  });

  it.each(['Abc!def1', 'Aa1[é中🫩字'])('accepts %s', (password) => {
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
