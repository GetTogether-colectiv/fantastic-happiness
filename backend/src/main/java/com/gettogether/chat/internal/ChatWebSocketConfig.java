package com.gettogether.chat.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
class ChatWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final String[] allowedOrigins;
    private final ChatAuthInterceptor chatAuthInterceptor;

    ChatWebSocketConfig(@Value("${gettogether.cors.allowed-origins}") String[] allowedOrigins,
                        ChatAuthInterceptor chatAuthInterceptor) {
        this.allowedOrigins = allowedOrigins;
        this.chatAuthInterceptor = chatAuthInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(allowedOrigins);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(chatAuthInterceptor);
    }
}