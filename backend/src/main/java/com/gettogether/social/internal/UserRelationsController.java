package com.gettogether.social.internal;

import com.gettogether.users.CurrentUserProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/users")
class UserRelationsController {

    private final FriendshipService friendshipService;
    private final CurrentUserProvider currentUserProvider;

    UserRelationsController(FriendshipService friendshipService, CurrentUserProvider currentUserProvider) {
        this.friendshipService = friendshipService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/search")
    List<UserSearchResult> search(@RequestParam String q) {
        return friendshipService.search(currentUserProvider.currentUserId(), q);
    }

    @GetMapping("/{id}/relation")
    UserRelationResponse relation(@PathVariable Long id) {
        return new UserRelationResponse(friendshipService.relationTo(currentUserProvider.currentUserId(), id));
    }
}
