package com.gettogether.posts.internal;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "posts")
class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private Long eventId;
    private Short rating;
    private String text;
    private Instant createdAt;

    protected Post() {
    }

    Post(Long userId, Long eventId, int rating, String text) {
        this.userId = userId;
        this.eventId = eventId;
        this.rating = (short) rating;
        this.text = text;
        this.createdAt = Instant.now();
    }

    Long getId() {
        return id;
    }

    Long getUserId() {
        return userId;
    }

    Long getEventId() {
        return eventId;
    }

    Short getRating() {
        return rating;
    }

    String getText() {
        return text;
    }

    Instant getCreatedAt() {
        return createdAt;
    }
}
