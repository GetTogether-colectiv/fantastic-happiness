package com.gettogether.events.internal;

import com.gettogether.events.EventDetails;
import com.gettogether.events.EventSummary;

final class EventMapper {

    private EventMapper() {
    }

    static EventSummary toSummary(Event event) {
        return new EventSummary(
                event.getId(),
                event.getTitle(),
                event.getCategory(),
                event.getStartsAt(),
                event.getEndsAt(),
                event.getCity(),
                event.getLocationName(),
                event.getLatitude(),
                event.getLongitude(),
                event.getImageUrl(),
                event.getCapacity());
    }

    static EventDetails toDetails(Event event) {
        return new EventDetails(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getCategory(),
                event.getStartsAt(),
                event.getEndsAt(),
                event.getCity(),
                event.getLocationName(),
                event.getLatitude(),
                event.getLongitude(),
                event.getImageUrl(),
                event.getCapacity(),
                event.getOrganizerId(),
                event.getCreatedAt());
    }
}
