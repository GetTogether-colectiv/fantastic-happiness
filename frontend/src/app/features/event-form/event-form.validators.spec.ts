import { FormControl, FormGroup } from '@angular/forms';
import {
  endAfterStartValidator,
  futureDateValidator,
  integerValidator,
  notBlankValidator,
  toDateTimeLocal,
  toInstant,
} from './event-form.validators';

const PAST = '2000-01-01T10:00';
const FUTURE = '2999-01-01T10:00';
const LATER = '2999-01-01T12:00';

describe('event form validators', () => {
  it('rejects a start in the past and accepts a future or empty one', () => {
    expect(futureDateValidator(new FormControl(PAST))).toEqual({ pastDate: true });
    expect(futureDateValidator(new FormControl(FUTURE))).toBeNull();
    expect(futureDateValidator(new FormControl(''))).toBeNull();
  });

  it('requires the end to be after the start', () => {
    const group = (startsAt: string, endsAt: string) =>
      new FormGroup({ startsAt: new FormControl(startsAt), endsAt: new FormControl(endsAt) });

    expect(endAfterStartValidator(group(FUTURE, LATER))).toBeNull();
    expect(endAfterStartValidator(group(LATER, FUTURE))).toEqual({ endBeforeStart: true });
    expect(endAfterStartValidator(group(FUTURE, FUTURE))).toEqual({ endBeforeStart: true });
    expect(endAfterStartValidator(group(FUTURE, ''))).toBeNull();
  });

  it('rejects blank text', () => {
    expect(notBlankValidator(new FormControl('   '))).toEqual({ required: true });
    expect(notBlankValidator(new FormControl(null))).toEqual({ required: true });
    expect(notBlankValidator(new FormControl(' Party '))).toBeNull();
  });

  it('accepts only whole numbers or an empty capacity', () => {
    expect(integerValidator(new FormControl(null))).toBeNull();
    expect(integerValidator(new FormControl(12))).toBeNull();
    expect(integerValidator(new FormControl(2.5))).toEqual({ integer: true });
  });

  it('converts between instants and datetime-local values', () => {
    const instant = '2999-01-01T10:30:00.000Z';

    expect(toInstant(toDateTimeLocal(instant))).toBe(instant);
    expect(toDateTimeLocal(instant)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
