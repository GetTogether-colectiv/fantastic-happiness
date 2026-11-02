package com.gettogether.events.internal;

import com.gettogether.events.EventCategory;
import com.gettogether.events.EventDetails;
import com.gettogether.events.EventSummary;
import com.gettogether.shared.NotFoundException;
import com.gettogether.shared.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/events")
class EventController {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 50;
    private static final Sort ORDER_BY_START = Sort.by("startsAt", "id");

    private final EventRepository eventRepository;

    EventController(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @GetMapping
    @Operation(summary = "List events ordered by start time, optionally filtered")
    PageResponse<EventSummary> findAll(
            @RequestParam(required = false) EventCategory category,
            @RequestParam(required = false) String city,
            @Parameter(description = "Only events starting at or after this instant (ISO-8601)")
            @RequestParam(required = false) Instant from,
            @Parameter(description = "Only events starting at or before this instant (ISO-8601)")
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size, between 1 and " + MAX_PAGE_SIZE)
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size) {
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE), ORDER_BY_START);
        return PageResponse.from(eventRepository
                .findAll(EventSpecifications.matching(category, city, from, to), pageRequest)
                .map(EventMapper::toSummary));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get the full details of an event")
    EventDetails findById(@PathVariable Long id) {
        return eventRepository.findById(id)
                .map(EventMapper::toDetails)
                .orElseThrow(() -> new NotFoundException("Event " + id + " not found"));
    }
}
