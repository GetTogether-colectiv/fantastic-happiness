package com.gettogether.social.internal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "friendships")
class Friendship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long requesterId;

    private Long addresseeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FriendshipStatus status;

    private Instant createdAt;

    protected Friendship() {
    }

    Friendship(Long requesterId, Long addresseeId) {
        this.requesterId = requesterId;
        this.addresseeId = addresseeId;
        this.status = FriendshipStatus.PENDING;
        this.createdAt = Instant.now();
    }

    void accept() {
        this.status = FriendshipStatus.ACCEPTED;
    }

    boolean isPendingFor(Long addresseeId) {
        return status == FriendshipStatus.PENDING && this.addresseeId.equals(addresseeId);
    }

    Long otherUserId(Long userId) {
        return requesterId.equals(userId) ? addresseeId : requesterId;
    }

    FriendRelation relationFor(Long userId) {
        if (status == FriendshipStatus.ACCEPTED) {
            return FriendRelation.FRIENDS;
        }
        return requesterId.equals(userId) ? FriendRelation.REQUESTED : FriendRelation.INCOMING;
    }

    Long getId() {
        return id;
    }

    Long getRequesterId() {
        return requesterId;
    }

    Long getAddresseeId() {
        return addresseeId;
    }

    FriendshipStatus getStatus() {
        return status;
    }

    Instant getCreatedAt() {
        return createdAt;
    }
}
