package com.gettogether.users.internal;


import com.gettogether.shared.EventCategory;

import java.util.Set;
import java.util.TreeSet;

record UserProfileDto(
        Long id, String displayName, String city, String avatarUrl, Set<EventCategory> preferredCategories) {

    static UserProfileDto from(User user) {
        // A TreeSet keeps the categories in enum order, so the JSON array is stable.
        return new UserProfileDto(
                user.getId(),
                user.getDisplayName(),
                user.getCity(),
                user.getAvatarUrl(),
                new TreeSet<>(user.getPreferredCategories()));
    }
}