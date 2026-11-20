package com.gettogether.chat.internal;

final class ChatDestinations {

    static final String APPLICATION_PREFIX = "/app";
    static final String TOPIC_PREFIX = "/topic";
    static final String QUEUE_PREFIX = "/queue";
    static final String CHAT_PATH = "/events/{eventId}/chat";
    static final String ERROR_QUEUE = QUEUE_PREFIX + "/errors";
    static final String USER_ERROR_QUEUE = "/user" + ERROR_QUEUE;

    private ChatDestinations() {
    }

    static String eventTopic(long eventId) {
        return TOPIC_PREFIX + CHAT_PATH.replace("{eventId}", Long.toString(eventId));
    }
}
