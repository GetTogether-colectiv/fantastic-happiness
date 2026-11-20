package com.gettogether.chat.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
class ChatWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final String[] allowedOrigins;
    private final ChatAuthInterceptor chatAuthInterceptor;
    private final ChatWebSocketSessions sessions;

    ChatWebSocketConfig(@Value("${gettogether.cors.allowed-origins}") String[] allowedOrigins,
                        ChatAuthInterceptor chatAuthInterceptor, ChatWebSocketSessions sessions) {
        this.allowedOrigins = allowedOrigins;
        this.chatAuthInterceptor = chatAuthInterceptor;
        this.sessions = sessions;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker(ChatDestinations.TOPIC_PREFIX, ChatDestinations.QUEUE_PREFIX);
        registry.setApplicationDestinationPrefixes(ChatDestinations.APPLICATION_PREFIX);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(allowedOrigins);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(chatAuthInterceptor);
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.interceptors(sessions);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.addDecoratorFactory(sessions);
    }

    @Bean
    static ThreadPoolTaskScheduler chatSocketExpiryScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setThreadNamePrefix("chat-socket-expiry-");
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }
}
