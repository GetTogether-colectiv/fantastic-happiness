package com.gettogether.events;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EventsApi {

    Optional<EventDetails> findById(Long id);

    List<EventSummary> findByIds(Collection<Long> ids);

    boolean exists(Long id);
}
