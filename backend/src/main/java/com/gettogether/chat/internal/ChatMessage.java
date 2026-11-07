package com.gettogether.chat.internal;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long eventId;
    private Long userId;
    private String content;
    private Instant sentAt;

    protected ChatMessage() {
    }

    ChatMessage(Long eventId, Long userId, String content) {
        this.eventId = eventId;
        this.userId = userId;
        this.content = content;
        this.sentAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getEventId() {
        return eventId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getContent() {
        return content;
    }

    public Instant getSentAt() {
        return sentAt;
    }
}