package com.gettogether.events;

import java.time.Instant;

public record EventDetails(
        Long id,
        String title,
        String description,
        EventCategory category,
        Instant startsAt,
        Instant endsAt,
        String city,
        String locationName,
        Double latitude,
        Double longitude,
        String imageUrl,
        Integer capacity,
        Long organizerId,
        Instant createdAt) {
}
