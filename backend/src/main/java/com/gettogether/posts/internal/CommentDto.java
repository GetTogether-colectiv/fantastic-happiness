package com.gettogether.posts.internal;

import java.time.Instant;

record CommentDto(
        Long id,
        Long postId,
        Long userId,
        String authorName,
        String authorAvatar,
        String text,
        Instant createdAt) {
}
