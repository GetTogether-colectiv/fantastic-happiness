package com.gettogether.posts.internal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

interface PostRepository extends JpaRepository<Post, Long> {

    boolean existsByUserIdAndEventId(Long userId, Long eventId);

    List<Post> findByEventIdOrderByCreatedAtDesc(Long eventId);

    @Query(value = """
            SELECT ROUND(AVG(rating), 1) AS "averageRating", COUNT(*) AS "count"
            FROM posts
            WHERE event_id = :eventId
            """, nativeQuery = true)
    PostRatingSummary summarizeRatings(@Param("eventId") Long eventId);
}
