import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, switchMap } from 'rxjs';
import {
  CATEGORY_LABELS,
  Coordinates,
  EVENT_CATEGORIES,
  EventCategory,
  EventDetails,
  EventRequest,
} from '../../core/models/event.model';
import { CurrentUserService } from '../../core/services/current-user.service';
import { EventsService } from '../../core/services/events.service';
import { Address, GeocodingService } from '../../core/services/geocoding.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { coordinatesOf } from '../../shared/map/map.utils';
import {
  endAfterStartValidator,
  futureDateValidator,
  integerValidator,
  notBlankValidator,
  toDateTimeLocal,
  toInstant,
} from './event-form.validators';
import { LocationPickerComponent } from './location-picker/location-picker.component';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

interface ServerError {
  fieldErrors?: Record<string, string>;
}

const FIELD_NAMES = [
  'title',
  'description',
  'category',
  'startsAt',
  'endsAt',
  'locationName',
  'city',
  'capacity',
  'imageUrl',
] as const;

type FieldName = (typeof FIELD_NAMES)[number];

const TITLE_MAX_LENGTH = 150;
const LOCATION_NAME_MAX_LENGTH = 200;
const CITY_MAX_LENGTH = 100;
const IMAGE_URL_MAX_LENGTH = 500;
const MINIMUM_CAPACITY = 1;
const SNACK_BAR_DURATION_MS = 3000;
const SERVER_ERROR_KEY = 'server';
const CREATED_MESSAGE = 'Event created';
const SAVED_MESSAGE = 'Changes saved';
const SAVE_FAILED_MESSAGE = "Couldn't save the event. Please try again.";
const NOT_ORGANIZER_MESSAGE = 'Only the organizer can edit this event.';
const INVALID_VALUE_MESSAGE = 'Invalid value';

const FIELD_MESSAGES: Record<FieldName, Record<string, string>> = {
  title: { required: 'Title is required', maxlength: 'Title is too long' },
  description: {},
  category: { required: 'Category is required' },
  startsAt: { required: 'Start is required', pastDate: "Start can't be in the past" },
  endsAt: { required: 'End is required', endBeforeStart: 'End must be after start' },
  locationName: { required: 'Location name is required', maxlength: 'Location name is too long' },
  city: { required: 'City is required', maxlength: 'City is too long' },
  capacity: { min: 'Capacity must be at least 1', integer: 'Capacity must be a whole number' },
  imageUrl: { maxlength: 'Image URL is too long' },
};

function isFieldName(name: string): name is FieldName {
  return (FIELD_NAMES as readonly string[]).includes(name);
}

@Component({
  selector: 'app-event-form-page',
  imports: [ReactiveFormsModule, EmptyStateComponent, ErrorStateComponent, LocationPickerComponent],
  templateUrl: './event-form-page.component.html',
  styleUrl: './event-form-page.component.scss',
})
export class EventFormPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly events = inject(EventsService);
  private readonly geocoding = inject(GeocodingService);
  private readonly pickedLocations = new Subject<Coordinates>();
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly currentUser = inject(CurrentUserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rawId = inject(ActivatedRoute).snapshot.paramMap.get('id');
  private readonly eventId = this.rawId === null ? null : Number(this.rawId);

  protected readonly categories = EVENT_CATEGORIES;
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly editing = this.eventId !== null;
  protected readonly loadState = signal<LoadState>(this.editing ? 'loading' : 'ready');
  protected readonly saving = signal(false);
  protected readonly submitError = signal('');
  protected readonly submitLabel = computed(() => {
    if (this.saving()) {
      return 'Saving…';
    }
    return this.editing ? 'Save changes' : 'Create';
  });

  protected readonly form = this.formBuilder.group(
    {
      title: ['', [notBlankValidator, Validators.maxLength(TITLE_MAX_LENGTH)]],
      description: [''],
      category: this.formBuilder.control<EventCategory | ''>('', Validators.required),
      startsAt: ['', [Validators.required, futureDateValidator]],
      endsAt: ['', Validators.required],
      locationName: ['', [notBlankValidator, Validators.maxLength(LOCATION_NAME_MAX_LENGTH)]],
      city: ['', [notBlankValidator, Validators.maxLength(CITY_MAX_LENGTH)]],
      location: this.formBuilder.control<Coordinates | null>(null),
      capacity: this.formBuilder.control<number | null>(null, [
        Validators.min(MINIMUM_CAPACITY),
        integerValidator,
      ]),
      imageUrl: ['', Validators.maxLength(IMAGE_URL_MAX_LENGTH)],
    },
    { validators: endAfterStartValidator },
  );

  constructor() {
    this.loadEvent();
    this.pickedLocations
      .pipe(
        switchMap((position) => this.geocoding.findAddress(position)),
        takeUntilDestroyed(),
      )
      .subscribe((address) => this.fillAddress(address));
  }

  protected autofillAddress(position: Coordinates): void {
    this.pickedLocations.next(position);
  }

  protected errorMessage(name: FieldName): string | null {
    const control = this.form.controls[name];
    if (!control.touched) {
      return null;
    }
    const errors = { ...control.errors, ...(name === 'endsAt' ? this.form.errors : null) };
    const [key] = Object.keys(errors);
    if (!key) {
      return null;
    }
    if (key === SERVER_ERROR_KEY) {
      return String(errors[key]);
    }
    return FIELD_MESSAGES[name][key] ?? INVALID_VALUE_MESSAGE;
  }

  protected retry(): void {
    this.loadEvent();
  }

  protected goToDiscover(): void {
    void this.router.navigate(['/discover']);
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    const request = this.toRequest();
    if (this.form.invalid || !request) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.submitError.set('');
    this.save(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => this.showSavedEvent(event.id),
        error: (error: unknown) => this.showSaveError(error),
      });
  }

  private loadEvent(): void {
    if (this.eventId === null) {
      return;
    }
    const id = this.eventId;
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.loadState.set('not-found');
      return;
    }
    this.loadState.set('loading');
    this.events
      .getEvent(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => this.fillForm(event),
        error: (error: unknown) =>
          this.loadState.set(
            error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
          ),
      });
  }

  private fillForm(event: EventDetails): void {
    if (event.organizerId !== this.currentUser.userId()) {
      void this.router.navigate(['/events', event.id], { replaceUrl: true });
      return;
    }
    this.form.patchValue({
      title: event.title,
      description: event.description ?? '',
      category: event.category,
      startsAt: toDateTimeLocal(event.startsAt),
      endsAt: toDateTimeLocal(event.endsAt),
      locationName: event.locationName,
      city: event.city,
      location: coordinatesOf(event),
      capacity: event.capacity,
      imageUrl: event.imageUrl ?? '',
    });
    this.form.markAllAsTouched();
    this.loadState.set('ready');
  }

  private fillAddress(address: Address): void {
    this.fillField('locationName', address.locationName);
    this.fillField('city', address.city);
  }

  private fillField(name: 'locationName' | 'city', value: string | null): void {
    if (!value) {
      return;
    }
    const control = this.form.controls[name];
    control.setValue(value);
    control.markAsTouched();
  }

  private save(request: EventRequest): Observable<EventDetails> {
    return this.eventId === null
      ? this.events.createEvent(request)
      : this.events.updateEvent(this.eventId, request);
  }

  private toRequest(): EventRequest | null {
    const value = this.form.getRawValue();
    if (value.category === '' || !value.startsAt || !value.endsAt) {
      return null;
    }
    return {
      title: value.title.trim(),
      description: value.description.trim() || null,
      category: value.category,
      startsAt: toInstant(value.startsAt),
      endsAt: toInstant(value.endsAt),
      locationName: value.locationName.trim(),
      city: value.city.trim(),
      capacity: value.capacity,
      imageUrl: value.imageUrl.trim() || null,
      latitude: value.location?.latitude ?? null,
      longitude: value.location?.longitude ?? null,
    };
  }

  private showSavedEvent(id: number): void {
    const message = this.editing ? SAVED_MESSAGE : CREATED_MESSAGE;
    void this.router.navigate(['/events', id]).then(() =>
      this.snackBar.open(message, undefined, {
        duration: SNACK_BAR_DURATION_MS,
        panelClass: 'app-snack-bar',
      }),
    );
  }

  private showSaveError(error: unknown): void {
    this.saving.set(false);
    if (!(error instanceof HttpErrorResponse)) {
      this.submitError.set(SAVE_FAILED_MESSAGE);
      return;
    }
    if (error.status === 403) {
      this.submitError.set(NOT_ORGANIZER_MESSAGE);
      return;
    }
    const fieldErrors =
      error.status === 400 ? (error.error as ServerError | null)?.fieldErrors : undefined;
    if (!fieldErrors) {
      this.submitError.set(SAVE_FAILED_MESSAGE);
      return;
    }
    const unmapped = Object.entries(fieldErrors).filter(
      ([name, message]) => !this.setServerError(name, message),
    );
    this.submitError.set(unmapped.map(([, message]) => message).join(' '));
  }

  private setServerError(name: string, message: string): boolean {
    if (!isFieldName(name)) {
      return false;
    }
    const control = this.form.controls[name];
    control.setErrors({ [SERVER_ERROR_KEY]: message });
    control.markAsTouched();
    return true;
  }
}
