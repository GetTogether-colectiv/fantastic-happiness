package com.gettogether.events.internal;

import com.gettogether.events.EventDetails;
import com.gettogether.events.EventsApi;
import com.gettogether.participation.ParticipationApi;
import com.gettogether.participation.ParticipationStatus;
import com.gettogether.shared.ConflictException;
import com.gettogether.shared.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
class EventParticipationService {

    private static final String EVENT_FULL = "EVENT_FULL";
    private static final int NOBODY_GOING = 0;

    private final EventsApi eventsApi;
    private final EventRepository eventRepository;
    private final ParticipationApi participationApi;

    EventParticipationService(EventsApi eventsApi, EventRepository eventRepository, ParticipationApi participationApi) {
        this.eventsApi = eventsApi;
        this.eventRepository = eventRepository;
        this.participationApi = participationApi;
    }

    ParticipationResponse setStatus(Long userId, Long eventId, ParticipationStatus status) {
        lockEvent(eventId);
        EventDetails event = findEvent(eventId);
        ParticipationStatus previousStatus = participationApi.findStatus(userId, eventId).orElse(null);
        if (status == ParticipationStatus.GOING && previousStatus != ParticipationStatus.GOING
                && event.capacity() != null && goingCount(eventId) >= event.capacity()) {
            throw new ConflictException(EVENT_FULL);
        }
        participationApi.setStatus(userId, eventId, status);
        return response(userId, event);
    }

    @Transactional(readOnly = true)
    ParticipationResponse findStatus(Long userId, Long eventId) {
        return response(userId, findEvent(eventId));
    }

    void remove(Long userId, Long eventId) {
        lockEvent(eventId);
        participationApi.remove(userId, eventId);
    }

    private EventDetails findEvent(Long eventId) {
        return eventsApi.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Event " + eventId + " not found"));
    }

    private void lockEvent(Long eventId) {
        // Keep the lock until commit so concurrent joins cannot claim the same remaining place.
        eventRepository.findByIdForUpdate(eventId)
                .orElseThrow(() -> new NotFoundException("Event " + eventId + " not found"));
    }

    private int goingCount(Long eventId) {
        return participationApi.countGoingByEventIds(List.of(eventId)).getOrDefault(eventId, NOBODY_GOING);
    }

    private ParticipationResponse response(Long userId, EventDetails event) {
        return new ParticipationResponse(participationApi.findStatus(userId, event.id()).orElse(null),
                goingCount(event.id()), event.capacity());
    }
}
