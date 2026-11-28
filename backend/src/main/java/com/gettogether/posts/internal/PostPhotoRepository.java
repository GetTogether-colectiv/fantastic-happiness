package com.gettogether.posts.internal;

import org.jspecify.annotations.NullMarked;
import org.springframework.data.jpa.repository.JpaRepository;

@NullMarked
interface PostPhotoRepository extends JpaRepository<PostPhoto, Long> {

    long countByPostId(Long postId);
}