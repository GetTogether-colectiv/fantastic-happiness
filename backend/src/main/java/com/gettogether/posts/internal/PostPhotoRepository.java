package com.gettogether.posts.internal;

import org.jspecify.annotations.NullMarked;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

@NullMarked
interface PostPhotoRepository extends JpaRepository<PostPhoto, Long> {

    long countByPostId(Long postId);

    List<PostPhoto> findByPostIdInOrderByPosition(Collection<Long> postIds);
}