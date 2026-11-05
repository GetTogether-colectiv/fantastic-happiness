package com.gettogether.participation;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

public interface ParticipationApi {

    /**
     * Number of people going to each of the given events. Events nobody is going to are absent from the result.
     */
    Map<Long, Integer> countGoingByEventIds(Collection<Long> eventIds);

    Optional<ParticipationStatus> findStatus(Long userId, Long eventId);

    void setStatus(Long userId, Long eventId, ParticipationStatus status);

    void remove(Long userId, Long eventId);
}
