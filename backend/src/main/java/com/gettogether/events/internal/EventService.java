package com.gettogether.events.internal;

import com.gettogether.shared.EventCategory;
import com.gettogether.events.EventSummary;
import com.gettogether.participation.ParticipationApi;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Service
class EventService {

    private static final int NOBODY_GOING = 0;
    private static final Sort FEED_ORDER = Sort.by("startsAt", "id");

    private final EventRepository eventRepository;
    private final ParticipationApi participationApi;

    EventService(EventRepository eventRepository, ParticipationApi participationApi) {
        this.eventRepository = eventRepository;
        this.participationApi = participationApi;
    }

    Page<EventSummary> findUpcoming(EventCategory category, String city, Instant from, Instant to, MapArea area,
                                    Pageable pageable) {
        Specification<Event> filters = Specification.allOf(
                EventSpecifications.notEndedBefore(Instant.now()),
                EventSpecifications.matching(category, city, from, to),
                EventSpecifications.insideArea(area));
        Page<Event> events = eventRepository.findAll(filters, pageable);
        Map<Long, Integer> goingCounts = countGoing(events.getContent());
        return events.map(event -> EventMapper.toSummary(event, goingCounts.getOrDefault(event.getId(), NOBODY_GOING)));
    }

    List<EventSummary> findByIds(Collection<Long> ids) {
        List<Event> events = eventRepository.findAllById(ids);
        Map<Long, Integer> goingCounts = countGoing(events);
        return events.stream()
                .map(event -> EventMapper.toSummary(event, goingCounts.getOrDefault(event.getId(), NOBODY_GOING)))
                .toList();
    }

    List<EventSummary> findUpcoming(Collection<Long> excludedIds, int limit) {
        Specification<Event> filters = Specification.allOf(
                EventSpecifications.startsAfter(Instant.now()),
                EventSpecifications.excludingIds(excludedIds));
        List<Event> events = eventRepository.findAll(filters, PageRequest.of(0, limit, FEED_ORDER)).getContent();
        Map<Long, Integer> goingCounts = countGoing(events);
        return events.stream()
                .map(event -> EventMapper.toSummary(event, goingCounts.getOrDefault(event.getId(), NOBODY_GOING)))
                .toList();
    }

    private Map<Long, Integer> countGoing(List<Event> events) {
        return participationApi.countGoingByEventIds(events.stream().map(Event::getId).toList());
    }
}
