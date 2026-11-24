package com.gettogether.social.internal;

import com.gettogether.shared.BadRequestException;
import com.gettogether.shared.ConflictException;
import com.gettogether.shared.ForbiddenException;
import com.gettogether.shared.NotFoundException;
import com.gettogether.social.FriendRequestSent;
import com.gettogether.users.UserSummary;
import com.gettogether.users.UsersApi;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
class FriendshipService {

    static final int SEARCH_MIN_LENGTH = 2;
    static final int SEARCH_MAX_RESULTS = 20;
    static final String ALREADY_FRIENDS = "ALREADY_FRIENDS";
    static final String REQUEST_ALREADY_SENT = "REQUEST_ALREADY_SENT";

    private static final Comparator<UserSummary> BY_NAME = Comparator
            .comparing(UserSummary::displayName, String.CASE_INSENSITIVE_ORDER)
            .thenComparing(UserSummary::id);

    private final FriendshipRepository friendshipRepository;
    private final UsersApi usersApi;
    private final ApplicationEventPublisher eventPublisher;

    FriendshipService(FriendshipRepository friendshipRepository, UsersApi usersApi,
                      ApplicationEventPublisher eventPublisher) {
        this.friendshipRepository = friendshipRepository;
        this.usersApi = usersApi;
        this.eventPublisher = eventPublisher;
    }

    FriendRequestResponse sendRequest(Long requesterId, Long addresseeId) {
        requireOtherExistingUser(requesterId, addresseeId, "You can't send a friend request to yourself");
        Friendship friendship = friendshipRepository.findBetween(requesterId, addresseeId)
                .map(existing -> acceptReverseRequest(existing, requesterId))
                .orElseGet(() -> createRequest(requesterId, addresseeId));
        return FriendRequestResponse.from(friendship);
    }

    FriendRequestResponse accept(Long userId, Long requestId) {
        Friendship friendship = findPendingAddressedTo(userId, requestId);
        friendship.accept();
        return FriendRequestResponse.from(friendship);
    }

    void decline(Long userId, Long requestId) {
        friendshipRepository.delete(findPendingAddressedTo(userId, requestId));
    }

    void removeFriend(Long userId, Long friendId) {
        Friendship friendship = friendshipRepository.findBetween(userId, friendId)
                .filter(existing -> existing.getStatus() == FriendshipStatus.ACCEPTED)
                .orElseThrow(() -> new NotFoundException("User " + friendId + " is not your friend"));
        friendshipRepository.delete(friendship);
    }

    @Transactional(readOnly = true)
    FriendRelation relationTo(Long userId, Long otherUserId) {
        requireOtherExistingUser(userId, otherUserId, "You have no friend relation with yourself");
        return friendshipRepository.findBetween(userId, otherUserId)
                .map(friendship -> friendship.relationFor(userId))
                .orElse(FriendRelation.NONE);
    }

    @Transactional(readOnly = true)
    List<UserSummary> friends(Long userId) {
        List<Long> friendIds = friendshipRepository.findOtherUserIds(userId, FriendshipStatus.ACCEPTED);
        return usersApi.findByIds(friendIds).stream().sorted(BY_NAME).toList();
    }

    @Transactional(readOnly = true)
    List<IncomingFriendRequest> incomingRequests(Long userId) {
        List<Friendship> requests = friendshipRepository
                .findByAddresseeIdAndStatusOrderByCreatedAtDesc(userId, FriendshipStatus.PENDING);
        Map<Long, UserSummary> requesters = usersApi
                .findByIds(requests.stream().map(Friendship::getRequesterId).toList())
                .stream()
                .collect(Collectors.toMap(UserSummary::id, Function.identity()));
        return requests.stream()
                .filter(request -> requesters.containsKey(request.getRequesterId()))
                .map(request -> new IncomingFriendRequest(
                        request.getId(), requesters.get(request.getRequesterId()), request.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    List<UserSearchResult> search(Long userId, String query) {
        String text = query.strip();
        if (text.length() < SEARCH_MIN_LENGTH) {
            return List.of();
        }
        List<UserSummary> users = usersApi.searchByName(text, userId, SEARCH_MAX_RESULTS);
        if (users.isEmpty()) {
            return List.of();
        }
        Map<Long, FriendRelation> relations = friendshipRepository
                .findAllBetween(userId, users.stream().map(UserSummary::id).toList())
                .stream()
                .collect(Collectors.toMap(friendship -> friendship.otherUserId(userId),
                        friendship -> friendship.relationFor(userId)));
        return users.stream()
                .map(user -> UserSearchResult.from(user, relations.getOrDefault(user.id(), FriendRelation.NONE)))
                .toList();
    }

    private void requireOtherExistingUser(Long userId, Long otherUserId, String selfMessage) {
        if (userId.equals(otherUserId)) {
            throw new BadRequestException(selfMessage);
        }
        if (!usersApi.exists(otherUserId)) {
            throw new NotFoundException("User " + otherUserId + " not found");
        }
    }

    private Friendship acceptReverseRequest(Friendship existing, Long requesterId) {
        if (existing.isPendingFor(requesterId)) {
            existing.accept();
            return existing;
        }
        throw new ConflictException(existing.getStatus() == FriendshipStatus.ACCEPTED
                ? ALREADY_FRIENDS : REQUEST_ALREADY_SENT);
    }

    private Friendship createRequest(Long requesterId, Long addresseeId) {
        Friendship friendship;
        try {
            friendship = friendshipRepository.saveAndFlush(new Friendship(requesterId, addresseeId));
        } catch (DataIntegrityViolationException concurrentRequestForThePair) {
            throw new ConflictException(REQUEST_ALREADY_SENT);
        }
        eventPublisher.publishEvent(new FriendRequestSent(friendship.getId(), requesterId, addresseeId));
        return friendship;
    }

    private Friendship findPendingAddressedTo(Long userId, Long requestId) {
        Friendship friendship = friendshipRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Friend request " + requestId + " not found"));
        if (!friendship.getAddresseeId().equals(userId)) {
            throw new ForbiddenException("Only the person who received the request can answer it");
        }
        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new ConflictException(ALREADY_FRIENDS);
        }
        return friendship;
    }
}
