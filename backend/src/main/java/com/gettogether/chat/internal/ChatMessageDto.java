package com.gettogether.chat.internal;

import java.time.Instant;

record ChatMessageDto(
        Long id,
        Long eventId,
        Long userId,
        String userName,
        String userAvatarUrl,
        String content,
        Instant sentAt) {
}