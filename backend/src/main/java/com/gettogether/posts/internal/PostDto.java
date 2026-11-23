package com.gettogether.posts.internal;

import java.time.Instant;

record PostDto(
        Long id,
        Long userId,
        Long eventId,
        int rating,
        String text,
        Instant createdAt) {
}
