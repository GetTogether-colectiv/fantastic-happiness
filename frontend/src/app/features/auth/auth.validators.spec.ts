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
  it.each(['short1', 'longer-password', '😀😀😀😀1'])('rejects %s', (password) => {
    expect(passwordRequirementsValidator(new FormControl(password))).toEqual({
      passwordRequirements: true,
    });
  });

  it('allows a multibyte password at the BCrypt limit and rejects one byte more', () => {
    const password = 'é'.repeat(35) + '12';
    expect(passwordRequirementsValidator(new FormControl(password))).toBeNull();
    expect(passwordRequirementsValidator(new FormControl(password + '3'))).toEqual({
      passwordRequirements: true,
    });
  });
});
