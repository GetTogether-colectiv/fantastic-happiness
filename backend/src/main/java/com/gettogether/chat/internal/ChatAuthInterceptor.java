package com.gettogether.chat.internal;

import com.gettogether.shared.ForbiddenException;
import com.gettogether.users.UserTokenAuthenticator;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

@Component
@NullMarked
class ChatAuthInterceptor implements ChannelInterceptor {

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    private final UserTokenAuthenticator authenticator;
    private final ChatWebSocketSessions sessions;
    private final ChatService chatService;

    ChatAuthInterceptor(UserTokenAuthenticator authenticator, ChatWebSocketSessions sessions, ChatService chatService) {
        this.authenticator = authenticator;
        this.sessions = sessions;
        this.chatService = chatService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        StompCommand command = accessor == null ? null : accessor.getCommand();
        if (accessor == null || command == null) {
            return message;
        }

        switch (command) {
            case CONNECT, STOMP -> authenticate(accessor);
            case SUBSCRIBE -> subscribe(accessor);
            case SEND -> {
                sessions.connection(accessor.getSessionId()).requireUserId();
                eventId(ChatDestinations.APPLICATION_PREFIX, accessor.getDestination());
            }
            case UNSUBSCRIBE -> sessions.connection(accessor.getSessionId()).unsubscribe(accessor.getSubscriptionId());
            default -> {
            }
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String authorization = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
        accessor.removeNativeHeader(HttpHeaders.AUTHORIZATION);
        var user = authenticator.authenticate(authorization);
        sessions.connection(accessor.getSessionId()).authenticate(user);
        accessor.setUser(() -> Long.toString(user.userId()));
    }

    private void subscribe(StompHeaderAccessor accessor) {
        var connection = sessions.connection(accessor.getSessionId());
        long userId = connection.requireUserId();
        String destination = accessor.getDestination();
        if (ChatDestinations.USER_ERROR_QUEUE.equals(destination)) {
            return;
        }

        String subscriptionId = accessor.getSubscriptionId();
        if (subscriptionId == null) {
            throw new ForbiddenException("Invalid chat subscription");
        }
        long eventId = eventId(ChatDestinations.TOPIC_PREFIX, destination);
        connection.subscribe(subscriptionId, eventId, () -> chatService.requireGoing(userId, eventId));
    }

    private static long eventId(String prefix, @Nullable String destination) {
        String template = prefix + ChatDestinations.CHAT_PATH;
        if (destination != null && PATH_MATCHER.match(template, destination)) {
            String id = PATH_MATCHER.extractUriTemplateVariables(template, destination).get("eventId");
            try {
                long eventId = Long.parseLong(id);
                if (eventId > 0 && destination.equals(template.replace("{eventId}", Long.toString(eventId)))) {
                    return eventId;
                }
            } catch (NumberFormatException exception) {
                throw new ForbiddenException("Invalid chat destination");
            }
        }
        throw new ForbiddenException("Invalid chat destination");
    }
}
