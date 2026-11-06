package com.gettogether.chat.internal;

import org.jspecify.annotations.NullMarked;
import org.springframework.data.jpa.repository.JpaRepository;

@NullMarked
interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
}