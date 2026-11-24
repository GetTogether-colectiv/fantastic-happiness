package com.gettogether.social.internal;

import com.gettogether.users.UserSummary;

record UserSearchResult(Long id, String displayName, String avatarUrl, String city, FriendRelation relation) {

    static UserSearchResult from(UserSummary user, FriendRelation relation) {
        return new UserSearchResult(user.id(), user.displayName(), user.avatarUrl(), user.city(), relation);
    }
}
