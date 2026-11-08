import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const DATE_TIME_LOCAL_LENGTH = 16;
const MS_PER_MINUTE = 60_000;

export function toDateTimeLocal(instant: string): string {
  const date = new Date(instant);
  return new Date(date.getTime() - date.getTimezoneOffset() * MS_PER_MINUTE)
    .toISOString()
    .slice(0, DATE_TIME_LOCAL_LENGTH);
}

export function toInstant(dateTimeLocal: string): string {
  return new Date(dateTimeLocal).toISOString();
}

export const notBlankValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => (String(control.value ?? '').trim() ? null : { required: true });

export const integerValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value: unknown = control.value;
  return value === null || value === '' || Number.isInteger(value) ? null : { integer: true };
};

export const futureDateValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value: unknown = control.value;
  if (typeof value !== 'string' || !value) {
    return null;
  }
  return new Date(value).getTime() > Date.now() ? null : { pastDate: true };
};

export const endAfterStartValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const start = group.get('startsAt')?.value as string | null;
  const end = group.get('endsAt')?.value as string | null;
  if (!start || !end) {
    return null;
  }
  return new Date(end).getTime() > new Date(start).getTime() ? null : { endBeforeStart: true };
};
