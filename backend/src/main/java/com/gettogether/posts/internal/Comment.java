package com.gettogether.posts.internal;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "post_comments")
class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long postId;
    private Long userId;
    private String text;
    private Instant createdAt;

    protected Comment() {
    }

    Comment(Long postId, Long userId, String text) {
        this.postId = postId;
        this.userId = userId;
        this.text = text;
        this.createdAt = Instant.now();
    }

    Long getId() {
        return id;
    }

    Long getPostId() {
        return postId;
    }

    Long getUserId() {
        return userId;
    }

    String getText() {
        return text;
    }

    Instant getCreatedAt() {
        return createdAt;
    }
}
