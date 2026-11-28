package com.gettogether.posts.internal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByPostIdOrderByCreatedAtAscIdAsc(Long postId);

    @Query("""
            SELECT c.postId AS postId, COUNT(c) AS count
            FROM Comment c
            WHERE c.postId IN :postIds
            GROUP BY c.postId
            """)
    List<CommentCount> countByPostIds(@Param("postIds") Collection<Long> postIds);
}
