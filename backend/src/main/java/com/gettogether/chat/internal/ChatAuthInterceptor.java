package com.gettogether.chat.internal;

import com.gettogether.shared.UnauthorizedException;
import com.gettogether.users.UsersApi;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

import java.security.Principal;

@Component
@NullMarked
class ChatAuthInterceptor implements ChannelInterceptor {

    private static final String USER_ID_HEADER = "X-User-Id";

    private final UsersApi usersApi;

    ChatAuthInterceptor(UsersApi usersApi) {
        this.usersApi = usersApi;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            Long userId = parseUserId(accessor.getFirstNativeHeader(USER_ID_HEADER));
            if (usersApi.findById(userId).isEmpty()) {
                throw new UnauthorizedException("Unknown user " + userId);
            }
            Principal principal = userId::toString;
            accessor.setUser(principal);
        }
        return message;
    }

    private Long parseUserId(@Nullable String header) {
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