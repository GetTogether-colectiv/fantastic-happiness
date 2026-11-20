import { ValidatorFn, Validators } from '@angular/forms';

export const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 255;
export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

export const emailValidators = [
  Validators.required,
  Validators.email,
  Validators.maxLength(EMAIL_MAX_LENGTH),
];

export const notBlankValidator: ValidatorFn = (control) =>
  String(control.value ?? '').trim() ? null : { required: true };

export const passwordRequirementsValidator: ValidatorFn = (control) => {
  const password = String(control.value ?? '');
  if (!password) return null;

  if (/[\uD800-\uDFFF]/u.test(password)) {
    return { passwordRequirements: 'Remove invalid characters.' };
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return { passwordRequirements: 'Password is too long' };
  }
  if ([...password].length < PASSWORD_MIN_LENGTH) {
    return { passwordRequirements: `Use at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (!/[A-Z]/.test(password)) return { passwordRequirements: 'Add an uppercase letter (A–Z).' };
  if (!/[a-z]/.test(password)) return { passwordRequirements: 'Add a lowercase letter (a–z).' };
  if (!/[0-9]/.test(password)) return { passwordRequirements: 'Add a digit (0–9).' };
  if (!/[!-/:-@\x5B-\x60{-~]/.test(password)) {
    return { passwordRequirements: 'Add a special character such as !, @, or #.' };
  }
  return null;
};

export function passwordMatchValidator(
  passwordField = 'password',
  confirmationField = 'confirmPassword',
): ValidatorFn {
  return (group) => {
    const password = group.get(passwordField)?.value;
    const confirmation = group.get(confirmationField)?.value;
    return password && confirmation && password !== confirmation
      ? { passwordMismatch: true }
      : null;
  };
}
