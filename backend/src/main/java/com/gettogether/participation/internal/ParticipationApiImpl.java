package com.gettogether.participation.internal;

import com.gettogether.participation.ParticipationApi;
import com.gettogether.participation.ParticipationStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
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

    @Override
    public Optional<ParticipationStatus> findStatus(Long userId, Long eventId) {
        return participationRepository.findByUserIdAndEventId(userId, eventId).map(Participation::getStatus);
    }

    @Override
    @Transactional
    public void setStatus(Long userId, Long eventId, ParticipationStatus status) {
        Participation participation = participationRepository.findByUserIdAndEventId(userId, eventId)
                .orElseGet(() -> new Participation(userId, eventId, status));
        participation.changeStatus(status);
        participationRepository.save(participation);
    }

    @Override
    @Transactional
    public void remove(Long userId, Long eventId) {
        participationRepository.findByUserIdAndEventId(userId, eventId)
                .ifPresent(participationRepository::delete);
    }
}
