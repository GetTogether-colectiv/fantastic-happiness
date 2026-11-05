package com.gettogether.participation.internal;

import com.gettogether.participation.ParticipationApi;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;

@Service
class ParticipationApiImpl implements ParticipationApi {

    private final ParticipationRepository participationRepository;

    ParticipationApiImpl(ParticipationRepository participationRepository) {
        this.participationRepository = participationRepository;
    }

    @Override
    public Map<Long, Integer> countGoingByEventIds(Collection<Long> eventIds) {
        if (eventIds.isEmpty()) {
            return Map.of();
        }
        return participationRepository.countByEventIds(eventIds, ParticipationStatus.GOING).stream()
                .collect(Collectors.toMap(ParticipationCount::getEventId, count -> Math.toIntExact(count.getTotal())));
    }
}
