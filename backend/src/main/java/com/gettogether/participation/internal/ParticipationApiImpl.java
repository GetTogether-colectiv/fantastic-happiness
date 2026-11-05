package com.gettogether.participation.internal;

import com.gettogether.participation.ParticipationApi;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;

@Service
class ParticipationApiImpl implements ParticipationApi {

    private final AttendanceRepository attendanceRepository;

    ParticipationApiImpl(AttendanceRepository attendanceRepository) {
        this.attendanceRepository = attendanceRepository;
    }

    @Override
    public Map<Long, Integer> countGoingByEventIds(Collection<Long> eventIds) {
        if (eventIds.isEmpty()) {
            return Map.of();
        }
        return attendanceRepository.countByEventIds(eventIds).stream()
                .collect(Collectors.toMap(AttendanceCount::getEventId, count -> Math.toIntExact(count.getTotal())));
    }
}
