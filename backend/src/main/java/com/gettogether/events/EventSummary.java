package com.gettogether.events;

import java.time.Instant;

public record EventSummary(
        Long id,
        String title,
        EventCategory category,
        Instant startsAt,
        Instant endsAt,
        String city,
        String locationName,
        Double latitude,
        Double longitude,
        String imageUrl,
        Integer capacity,
        Integer goingCount) {
}
