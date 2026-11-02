package com.gettogether.users.internal;

import com.gettogether.shared.NotFoundException;
import com.gettogether.shared.UnauthorizedException;
import com.gettogether.users.CurrentUserProvider;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Component
class HeaderCurrentUserProvider implements CurrentUserProvider {

    private static final String USER_ID_HEADER = "X-User-Id";

    private final UserRepository userRepository;

    HeaderCurrentUserProvider(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public Long currentUserId() {
        Long userId = parseUserId(currentRequestHeader());
        if (!userRepository.existsById(userId)) {
            throw new NotFoundException("User " + userId + " not found");
        }
        return userId;
    }

    private String currentRequestHeader() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
        return attributes.getRequest().getHeader(USER_ID_HEADER);
    }

    private Long parseUserId(String header) {
        if (header == null || header.isBlank()) {
            throw new UnauthorizedException("Missing " + USER_ID_HEADER + " header");
        }
        try {
            return Long.valueOf(header.trim());
        } catch (NumberFormatException exception) {
            throw new UnauthorizedException("Invalid " + USER_ID_HEADER + " header");
        }
    }
}
