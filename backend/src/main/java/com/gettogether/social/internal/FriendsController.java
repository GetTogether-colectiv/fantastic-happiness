package com.gettogether.social.internal;

import com.gettogether.users.CurrentUserProvider;
import com.gettogether.users.UserSummary;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/friends")
class FriendsController {

    private final FriendshipService friendshipService;
    private final CurrentUserProvider currentUserProvider;

    FriendsController(FriendshipService friendshipService, CurrentUserProvider currentUserProvider) {
        this.friendshipService = friendshipService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    List<UserSummary> friends() {
        return friendshipService.friends(currentUserProvider.currentUserId());
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void removeFriend(@PathVariable Long userId) {
        friendshipService.removeFriend(currentUserProvider.currentUserId(), userId);
    }

    @GetMapping("/requests/incoming")
    List<IncomingFriendRequest> incomingRequests() {
        return friendshipService.incomingRequests(currentUserProvider.currentUserId());
    }

    @PostMapping("/requests")
    ResponseEntity<FriendRequestResponse> sendRequest(@Valid @RequestBody SendFriendRequest request) {
        FriendRequestResponse response =
                friendshipService.sendRequest(currentUserProvider.currentUserId(), request.userId());
        HttpStatus status = response.status() == FriendshipStatus.PENDING ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(response);
    }

    @PostMapping("/requests/{id}/accept")
    FriendRequestResponse accept(@PathVariable Long id) {
        return friendshipService.accept(currentUserProvider.currentUserId(), id);
    }

    @PostMapping("/requests/{id}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void decline(@PathVariable Long id) {
        friendshipService.decline(currentUserProvider.currentUserId(), id);
    }
}
