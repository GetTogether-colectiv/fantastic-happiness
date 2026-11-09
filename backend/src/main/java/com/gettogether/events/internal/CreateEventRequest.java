package com.gettogether.events.internal;

import com.gettogether.events.EventCategory;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.Instant;

@EndsAfterStart
public record CreateEventRequest(
        @NotBlank(message = "Title is required")
        @Size(max = EventConstraints.TITLE_MAX_LENGTH, message = "Title is too long")
        String title,
        String description,
        @NotNull(message = "Category is required")
        EventCategory category,
        @NotNull(message = "Start is required")
        @Future(message = "Start can't be in the past")
        Instant startsAt,
        @NotNull(message = "End is required")
        Instant endsAt,
        @NotBlank(message = "Location name is required")
        @Size(max = EventConstraints.LOCATION_NAME_MAX_LENGTH, message = "Location name is too long")
        String locationName,
        @NotBlank(message = "City is required")
        @Size(max = EventConstraints.CITY_MAX_LENGTH, message = "City is too long")
        String city,
        @Positive(message = "Capacity must be a positive number")
        Integer capacity,
        @Size(max = EventConstraints.IMAGE_URL_MAX_LENGTH, message = "Image URL is too long")
        String imageUrl) {
}