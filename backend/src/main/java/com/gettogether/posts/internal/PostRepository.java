package com.gettogether.posts.internal;

import org.springframework.data.jpa.repository.JpaRepository;

interface PostRepository extends JpaRepository<Post, Long> {

    boolean existsByUserIdAndEventId(Long userId, Long eventId);
}
