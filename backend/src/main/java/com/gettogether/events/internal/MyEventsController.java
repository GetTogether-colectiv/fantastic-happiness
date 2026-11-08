package com.gettogether.events.internal;

import com.gettogether.events.EventSummary;
import com.gettogether.events.EventsApi;
import com.gettogether.participation.ParticipationApi;
import com.gettogether.participation.ParticipationStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@RestController
class MyEventsController {

    enum When {
        UPCOMING,
        PAST
    }

    private final ParticipationApi participationApi;
    private final EventsApi eventsApi;

    MyEventsController(ParticipationApi participationApi, EventsApi eventsApi) {
        this.participationApi = participationApi;
        this.eventsApi = eventsApi;
    }

    @GetMapping("/me/events")
    List<EventSummary> getMyEvents(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam When when) {
        List<Long> eventIds = participationApi.listEventsFor(userId, ParticipationStatus.GOING);
        if (eventIds.isEmpty()) {
            return List.of();
        }

        Instant now = Instant.now();
        List<EventSummary> events = eventsApi.findByIds(eventIds);
        Comparator<EventSummary> byStart = Comparator.comparing(EventSummary::startsAt);

        return switch (when) {
            case UPCOMING -> events.stream()
                    .filter(event -> event.endsAt().isAfter(now))
                    .sorted(byStart)
                    .toList();
            case PAST -> events.stream()
                    .filter(event -> !event.endsAt().isAfter(now))
                    .sorted(byStart.reversed())
                    .toList();
        };
    }
}