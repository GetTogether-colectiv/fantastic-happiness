package com.gettogether.users;

import org.jspecify.annotations.Nullable;

import java.time.Instant;

public interface UserTokenAuthenticator {

    AuthenticatedUser authenticate(@Nullable String authorization);

    record AuthenticatedUser(long userId, Instant expiresAt) {
    }
}
