package com.gettogether.events.internal;

import com.gettogether.events.EventSummary;
import com.gettogether.events.EventsApi;
import com.gettogether.participation.ParticipationApi;
import com.gettogether.participation.ParticipationStatus;
import com.gettogether.users.CurrentUserProvider;
import org.springframework.web.bind.annotation.GetMapping;
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
    private final CurrentUserProvider currentUserProvider;

    MyEventsController(ParticipationApi participationApi, EventsApi eventsApi, CurrentUserProvider currentUserProvider) {
        this.participationApi = participationApi;
        this.eventsApi = eventsApi;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/me/events")
    List<EventSummary> getMyEvents(@RequestParam When when) {
        Long userId = currentUserProvider.currentUserId();
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
