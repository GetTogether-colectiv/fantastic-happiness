package com.gettogether.participation.internal;

import com.gettogether.participation.ParticipationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

interface ParticipationRepository extends JpaRepository<Participation, Long> {

    Optional<Participation> findByUserIdAndEventId(Long userId, Long eventId);

    @Query("select p.eventId as eventId, count(p) as total from Participation p "
            + "where p.eventId in :eventIds and p.status = :status group by p.eventId")
    List<ParticipationCount> countByEventIds(Collection<Long> eventIds, ParticipationStatus status);
}
