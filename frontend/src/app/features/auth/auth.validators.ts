import { ValidatorFn, Validators } from '@angular/forms';

export const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 255;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

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

  return [...password].length >= PASSWORD_MIN_LENGTH &&
    /[0-9]/.test(password) &&
    new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES
    ? null
    : { passwordRequirements: true };
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
