package com.gettogether.events.internal;

import com.gettogether.events.EventCategory;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

final class EventSpecifications {

    private EventSpecifications() {
    }

    static Specification<Event> notEndedBefore(Instant moment) {
        return (event, query, builder) -> builder.greaterThanOrEqualTo(event.get("endsAt"), moment);
    }

    static Specification<Event> startsAfter(Instant moment) {
        return (event, query, builder) -> builder.greaterThan(event.get("startsAt"), moment);
    }

    static Specification<Event> excludingIds(Collection<Long> excludedIds) {
        return excludedIds.isEmpty() ? Specification.unrestricted()
                : (event, query, builder) -> event.get("id").in(excludedIds).not();
    }

    static Specification<Event> matching(EventCategory category, String city, Instant from, Instant to) {
        List<Specification<Event>> filters = new ArrayList<>();
        if (category != null) {
            filters.add((event, query, builder) -> builder.equal(event.get("category"), category));
        }
        if (city != null) {
            filters.add((event, query, builder) ->
                    builder.equal(builder.lower(event.get("city")), city.toLowerCase()));
        }
        if (from != null) {
            filters.add((event, query, builder) -> builder.greaterThanOrEqualTo(event.get("startsAt"), from));
        }
        if (to != null) {
            filters.add((event, query, builder) -> builder.lessThanOrEqualTo(event.get("startsAt"), to));
        }
        return Specification.allOf(filters);
    }
}
