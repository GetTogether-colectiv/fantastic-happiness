package com.gettogether.social.internal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("select f from Friendship f where (f.requesterId = :firstUserId and f.addresseeId = :secondUserId) "
            + "or (f.requesterId = :secondUserId and f.addresseeId = :firstUserId)")
    Optional<Friendship> findBetween(Long firstUserId, Long secondUserId);

    @Query("select f from Friendship f where (f.requesterId = :userId and f.addresseeId in :otherUserIds) "
            + "or (f.addresseeId = :userId and f.requesterId in :otherUserIds)")
    List<Friendship> findAllBetween(Long userId, Collection<Long> otherUserIds);

    @Query("select case when f.requesterId = :userId then f.addresseeId else f.requesterId end "
            + "from Friendship f where f.status = :status and (f.requesterId = :userId or f.addresseeId = :userId)")
    List<Long> findOtherUserIds(Long userId, FriendshipStatus status);

    List<Friendship> findByAddresseeIdAndStatusOrderByCreatedAtDesc(Long addresseeId, FriendshipStatus status);
}
