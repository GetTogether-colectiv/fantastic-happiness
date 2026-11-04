package com.gettogether.participation;

import java.util.Collection;
import java.util.Map;

public interface ParticipationApi {

    /**
     * Number of people going to each of the given events. Events nobody is going to are absent from the result.
     */
    Map<Long, Integer> countGoingByEventIds(Collection<Long> eventIds);
}
