package com.gettogether.participation.internal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    @Query("select a.eventId as eventId, count(a) as total from Attendance a "
            + "where a.eventId in :eventIds group by a.eventId")
    List<AttendanceCount> countByEventIds(Collection<Long> eventIds);
}
