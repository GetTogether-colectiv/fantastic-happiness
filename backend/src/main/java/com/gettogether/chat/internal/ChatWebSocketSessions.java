package com.gettogether.chat.internal;

import com.gettogether.participation.EventLeft;
import com.gettogether.shared.UnauthorizedException;
import com.gettogether.users.UserTokenAuthenticator.AuthenticatedUser;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.ExecutorChannelInterceptor;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Component
@NullMarked
class ChatWebSocketSessions implements WebSocketHandlerDecoratorFactory, ExecutorChannelInterceptor {

    private static final CloseStatus TOKEN_EXPIRED = CloseStatus.POLICY_VIOLATION.withReason("Authentication expired");
    private static final CloseStatus MEMBERSHIP_ENDED = CloseStatus.POLICY_VIOLATION.withReason("Chat membership ended");

    private final Map<String, Connection> connections = new ConcurrentHashMap<>();
    private final TaskScheduler expiryScheduler;

    ChatWebSocketSessions(@Qualifier("chatSocketExpiryScheduler") TaskScheduler expiryScheduler) {
        this.expiryScheduler = expiryScheduler;
    }

    @Override
    public WebSocketHandler decorate(WebSocketHandler handler) {
        return new WebSocketHandlerDecorator(handler) {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                connections.put(session.getId(), new Connection(session));
                super.afterConnectionEstablished(session);
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
                Connection connection = connections.remove(session.getId());
                if (connection != null) {
                    connection.cancelExpiry();
                }
                super.afterConnectionClosed(session, status);
            }
        };
    }

    Connection connection(@Nullable String sessionId) {
        Connection connection = sessionId == null ? null : connections.get(sessionId);
        if (connection == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return connection;
    }

    @TransactionalEventListener
    void onEventLeft(EventLeft event) {
        connections.values().forEach(connection -> connection.revoke(event));
    }

    @Override
    public @Nullable Message<?> beforeHandle(Message<?> message, MessageChannel channel, MessageHandler handler) {
        var headers = message.getHeaders();
        if (SimpMessageHeaderAccessor.getMessageType(headers) != SimpMessageType.MESSAGE) {
            return message;
        }
        String sessionId = SimpMessageHeaderAccessor.getSessionId(headers);
        Connection connection = sessionId == null ? null : connections.get(sessionId);
        return connection != null && connection.canDeliver(SimpMessageHeaderAccessor.getDestination(headers),
                SimpMessageHeaderAccessor.getSubscriptionId(headers)) ? message : null;
    }

    final class Connection {

        private final WebSocketSession socket;
        private final Map<String, Long> subscriptions = new HashMap<>();
        private @Nullable AuthenticatedUser user;
        private @Nullable ScheduledFuture<?> expiry;
        private boolean closing;

        private Connection(WebSocketSession socket) {
            this.socket = socket;
        }

        synchronized void authenticate(AuthenticatedUser identity) {
            if (closing || user != null || !identity.expiresAt().isAfter(Instant.now())) {
                throw new UnauthorizedException("Invalid chat connection");
            }
            user = identity;
            expiry = expiryScheduler.schedule(() -> close(TOKEN_EXPIRED), identity.expiresAt());
        }

        synchronized long requireUserId() {
            AuthenticatedUser activeUser = activeUser();
            if (activeUser == null) {
                throw new UnauthorizedException("Authentication required");
            }
            return activeUser.userId();
        }

        synchronized void subscribe(String subscriptionId, long eventId, Runnable checkMembership) {
            requireUserId();
            checkMembership.run();
            subscriptions.put(subscriptionId, eventId);
        }

        synchronized void unsubscribe(@Nullable String subscriptionId) {
            subscriptions.remove(subscriptionId);
        }

        synchronized boolean canDeliver(@Nullable String destination, @Nullable String subscriptionId) {
            if (activeUser() == null) {
                return false;
            }
            if (destination != null && destination.startsWith(ChatDestinations.TOPIC_PREFIX + "/")) {
                Long eventId = subscriptions.get(subscriptionId);
                return eventId != null && ChatDestinations.eventTopic(eventId).equals(destination);
            }
            return true;
        }

        private @Nullable AuthenticatedUser activeUser() {
            return !closing && user != null && user.expiresAt().isAfter(Instant.now()) ? user : null;
        }

        void revoke(EventLeft event) {
            synchronized (this) {
                if (user == null || user.userId() != event.userId()
                        || !subscriptions.values().removeIf(event.eventId()::equals)) {
                    return;
                }
            }
            close(MEMBERSHIP_ENDED);
        }

        private void close(CloseStatus status) {
            synchronized (this) {
                if (closing) {
                    return;
                }
                cancelExpiry();
            }
            try {
                socket.close(status);
            } catch (IOException exception) {
                // The closing flag still blocks messages if the transport cannot send the close frame.
            }
        }

        private synchronized void cancelExpiry() {
            closing = true;
            if (expiry != null) {
                expiry.cancel(false);
            }
        }
    }
}
