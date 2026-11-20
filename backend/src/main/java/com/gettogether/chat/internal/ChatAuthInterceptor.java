package com.gettogether.chat.internal;

import com.gettogether.users.UserTokenAuthenticator;
import org.jspecify.annotations.NullMarked;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
@NullMarked
class ChatAuthInterceptor implements ChannelInterceptor {

    private final UserTokenAuthenticator authenticator;

    ChatAuthInterceptor(UserTokenAuthenticator authenticator) {
        this.authenticator = authenticator;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && (StompCommand.CONNECT.equals(accessor.getCommand())
                || StompCommand.STOMP.equals(accessor.getCommand()))) {
            String authorization = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
            accessor.removeNativeHeader(HttpHeaders.AUTHORIZATION);
            Long userId = authenticator.authenticate(authorization);
            accessor.setUser(userId::toString);
        }
        return message;
    }
}
