package com.gettogether.events.internal;

import com.gettogether.events.EventCreated;
import com.gettogether.events.EventDetails;
import com.gettogether.shared.ForbiddenException;
import com.gettogether.shared.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
class EventManagementService {

    private static final String NOT_ORGANIZER_MESSAGE = "Only the organizer can edit this event";

    private final EventRepository eventRepository;
    private final ApplicationEventPublisher eventPublisher;

    EventManagementService(EventRepository eventRepository, ApplicationEventPublisher eventPublisher) {
        this.eventRepository = eventRepository;
        this.eventPublisher = eventPublisher;
    }

    EventDetails create(Long organizerId, CreateEventRequest request) {
        Event event = eventRepository.save(new Event(organizerId, request));
        eventPublisher.publishEvent(new EventCreated(event.getId(), event.getCategory().name(), organizerId));
        return EventMapper.toDetails(event);
    }

    EventDetails update(Long eventId, Long currentUserId, CreateEventRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Event " + eventId + " not found"));
        if (!event.getOrganizerId().equals(currentUserId)) {
            throw new ForbiddenException(NOT_ORGANIZER_MESSAGE);
        }
        event.update(request);
        return EventMapper.toDetails(event);
    }
}