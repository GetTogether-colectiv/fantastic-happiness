package com.gettogether.users.internal;

import com.gettogether.shared.UnauthorizedException;
import com.gettogether.users.CurrentUserProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
class SecurityContextCurrentUserProvider implements CurrentUserProvider {

    @Override
    public Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Long userId) {
            return userId;
        }
        throw new UnauthorizedException("Authentication required");
    }
}
