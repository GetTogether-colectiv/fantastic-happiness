package com.gettogether.participation.internal;

import com.gettogether.participation.ParticipationApi;
import com.gettogether.participation.ParticipationStatus;
import com.gettogether.participation.EventJoined;
import com.gettogether.participation.EventLeft;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
class ParticipationApiImpl implements ParticipationApi {

    private final ParticipationRepository participationRepository;
    private final ApplicationEventPublisher eventPublisher;

    ParticipationApiImpl(ParticipationRepository participationRepository, ApplicationEventPublisher eventPublisher) {
        this.participationRepository = participationRepository;
        this.eventPublisher = eventPublisher;
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
        Optional<Participation> existing = participationRepository.findByUserIdAndEventId(userId, eventId);
        ParticipationStatus previousStatus = existing.map(Participation::getStatus).orElse(null);
        Participation participation = existing.orElseGet(() -> new Participation(userId, eventId, status));
        participation.changeStatus(status);
        participationRepository.save(participation);

        if (previousStatus != status) {
            if (status == ParticipationStatus.GOING) {
                eventPublisher.publishEvent(new EventJoined(userId, eventId));
            } else if (previousStatus == ParticipationStatus.GOING) {
                eventPublisher.publishEvent(new EventLeft(userId, eventId));
            }
        }
    }

    @Override
    @Transactional
    public void remove(Long userId, Long eventId) {
        participationRepository.findByUserIdAndEventId(userId, eventId)
                .ifPresent(participation -> {
                    participationRepository.delete(participation);
                    if (participation.getStatus() == ParticipationStatus.GOING) {
                        eventPublisher.publishEvent(new EventLeft(userId, eventId));
                    }
                });
    }

    @Override
    public boolean isGoing(Long userId, Long eventId) {
        return participationRepository.existsByUserIdAndEventIdAndStatus(userId, eventId, ParticipationStatus.GOING);
    }

    @Override
    public List<Long> listGoingUserIds(Long eventId) {
        return participationRepository.findUserIdsByEventIdAndStatus(eventId, ParticipationStatus.GOING);
    }

    @Override
    public List<Long> listEventsFor(Long userId, ParticipationStatus status) {
        return participationRepository.findEventIdsByUserIdAndStatus(userId, status);
    }
}
