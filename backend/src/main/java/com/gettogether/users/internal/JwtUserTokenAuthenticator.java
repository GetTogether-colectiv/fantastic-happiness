package com.gettogether.users.internal;

import com.gettogether.shared.UnauthorizedException;
import com.gettogether.users.UserTokenAuthenticator;
import io.jsonwebtoken.JwtException;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;

@Service
class JwtUserTokenAuthenticator implements UserTokenAuthenticator {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String INVALID_TOKEN = "Invalid bearer token";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    JwtUserTokenAuthenticator(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    public Long authenticate(@Nullable String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            throw new UnauthorizedException(INVALID_TOKEN);
        }

        long userId;
        try {
            userId = jwtService.verifyToken(authorization.substring(BEARER_PREFIX.length()).strip());
        } catch (JwtException | IllegalArgumentException exception) {
            throw new UnauthorizedException(INVALID_TOKEN);
        }

        if (!userRepository.existsById(userId)) {
            throw new UnauthorizedException(INVALID_TOKEN);
        }
        return userId;
    }
}
