package com.gettogether.events.internal;

import com.gettogether.events.EventSummary;
import com.gettogether.events.EventsApi;
import com.gettogether.participation.ParticipationApi;
import com.gettogether.participation.ParticipationStatus;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
class SwipeFeedService {

    private final EventsApi eventsApi;
    private final ParticipationApi participationApi;

    SwipeFeedService(EventsApi eventsApi, ParticipationApi participationApi) {
        this.eventsApi = eventsApi;
        this.participationApi = participationApi;
    }

    List<EventSummary> findFeed(Long userId, int size) {
        Set<Long> excludedIds = new HashSet<>(participationApi.listEventsFor(userId, ParticipationStatus.GOING));
        excludedIds.addAll(participationApi.listEventsFor(userId, ParticipationStatus.NOT_INTERESTED));
        return eventsApi.findUpcoming(excludedIds, size);
    }
}
