package com.gettogether.social.internal;

record FriendRequestResponse(Long id, FriendshipStatus status) {

    static FriendRequestResponse from(Friendship friendship) {
        return new FriendRequestResponse(friendship.getId(), friendship.getStatus());
    }
}
