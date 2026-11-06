package com.gettogether.chat.internal;

import org.jspecify.annotations.NullMarked;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

@NullMarked
interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByEventIdOrderBySentAtDesc(Long eventId, Pageable pageable);
    List<ChatMessage> findByEventIdAndSentAtBeforeOrderBySentAtDesc(Long eventId, Instant before, Pageable pageable);
}