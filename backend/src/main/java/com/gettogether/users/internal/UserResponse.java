package com.gettogether.users.internal;

record UserResponse(Long id, String displayName, String avatarUrl, String city) {

    static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getDisplayName(), user.getAvatarUrl(), user.getCity());
    }
}
