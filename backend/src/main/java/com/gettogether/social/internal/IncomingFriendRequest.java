package com.gettogether.social.internal;

import com.gettogether.users.UserSummary;

import java.time.Instant;

record IncomingFriendRequest(Long id, UserSummary user, Instant createdAt) {
}
