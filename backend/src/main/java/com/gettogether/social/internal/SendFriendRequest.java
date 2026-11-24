package com.gettogether.social.internal;

import jakarta.validation.constraints.NotNull;

record SendFriendRequest(@NotNull Long userId) {
}
