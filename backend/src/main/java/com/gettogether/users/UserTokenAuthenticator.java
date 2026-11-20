package com.gettogether.users;

import org.jspecify.annotations.Nullable;

public interface UserTokenAuthenticator {

    Long authenticate(@Nullable String authorization);
}
