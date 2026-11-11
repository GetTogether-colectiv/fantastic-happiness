package com.gettogether.events.internal;

import com.gettogether.TestcontainersConfiguration;
import com.gettogether.shared.EventCategory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class EventSeedTests {

    private static final int MINIMUM_EVENTS_PER_CATEGORY = 3;
    private static final int MINIMUM_PAST_EVENTS = 10;

    @Autowired
    private EventRepository eventRepository;

    @Test
    void everyCategoryHasSeedEvents() {
        List<Event> events = eventRepository.findAll();

        var countsByCategory = events.stream()
                .collect(Collectors.groupingBy(Event::getCategory, Collectors.counting()));

        for (EventCategory category : EventCategory.values()) {
            assertThat(countsByCategory.get(category))
                    .as("events in %s", category)
                    .isGreaterThanOrEqualTo(MINIMUM_EVENTS_PER_CATEGORY);
        }
    }

    @Test
    void seedContainsPastAndUpcomingEvents() {
        Instant now = Instant.now();
        List<Event> events = eventRepository.findAll();

        assertThat(events.stream().filter(event -> event.getEndsAt().isBefore(now))).hasSizeGreaterThanOrEqualTo(MINIMUM_PAST_EVENTS);
        assertThat(events.stream().filter(event -> event.getStartsAt().isAfter(now))).isNotEmpty();
    }
}
