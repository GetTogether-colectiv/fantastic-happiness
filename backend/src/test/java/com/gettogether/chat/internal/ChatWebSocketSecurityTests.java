package com.gettogether.chat.internal;

import com.gettogether.TestJwtTokens;
import com.gettogether.TestcontainersConfiguration;
import com.gettogether.participation.ParticipationApi;
import com.gettogether.participation.ParticipationStatus;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class ChatWebSocketSecurityTests {

    private static final int TIMEOUT_SECONDS = 5;
    private static final long NON_MEMBER = 1L;
    private static final long MEMBER = 2L;
    private static final long UNKNOWN_USER = 999_999L;
    private static final String LEGACY_HEADER = "X-User-Id:";
    private static final String AUTHORIZATION_HEADER = HttpHeaders.AUTHORIZATION + ":";
    private static final String ERROR_QUEUE = "/queue/errors";
    private static final String SUBSCRIPTION_PROBE = "subscription-ready";

    @LocalServerPort
    private int port;

    @Value("${server.servlet.context-path}")
    private String contextPath;

    @Autowired
    private TestJwtTokens tokens;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private SimpMessagingTemplate messaging;

    @Autowired
    private ParticipationApi participation;

    @Test
    void rejectsMissingAndInvalidCredentialsOnConnect() throws Exception {
        List<List<String>> rejectedHeaders = List.of(
                List.of(),
                List.of(LEGACY_HEADER + MEMBER),
                List.of(AUTHORIZATION_HEADER + "Bearer invalid"),
                List.of(AUTHORIZATION_HEADER + tokens.expiredBearer(MEMBER)),
                List.of(AUTHORIZATION_HEADER + tokens.wrongSignatureBearer(MEMBER)),
                List.of(AUTHORIZATION_HEADER + tokens.bearer(UNKNOWN_USER)));

        try (HttpClient client = HttpClient.newHttpClient()) {
            for (List<String> headers : rejectedHeaders) {
                try (StompConnection connection = open(client)) {
                    connection.connect("CONNECT", headers);
                    assertThat(connection.receiveFrame()).startsWith("ERROR\n");
                    assertThat(connection.closed.get(TIMEOUT_SECONDS, TimeUnit.SECONDS)).isEqualTo(1002);
                }
            }
        }
    }

    @Test
    void usesTheStompConnectionIdentityEvenWhenSendSuppliesAnotherToken() throws Exception {
        long eventId = masterclassId();
        String content = "Message from the authenticated STOMP member";

        try (HttpClient client = HttpClient.newHttpClient(); StompConnection connection = open(client)) {
            connection.connect("STOMP", List.of(AUTHORIZATION_HEADER + tokens.bearer(MEMBER), LEGACY_HEADER + NON_MEMBER));
            assertThat(connection.receiveFrame()).startsWith("CONNECTED\n");
            sendChatWithConflictingCredentials(connection, eventId, NON_MEMBER, content);

            await().atMost(Duration.ofSeconds(TIMEOUT_SECONDS)).untilAsserted(() ->
                    assertThat(jdbc.queryForList("SELECT user_id FROM chat_messages WHERE event_id = ? AND content = ?",
                            Long.class, eventId, content)).containsExactly(MEMBER));
        } finally {
            jdbc.update("DELETE FROM chat_messages WHERE event_id = ? AND content = ?", eventId, content);
        }
    }

    @Test
    void rejectsChatMessagesFromAnAuthenticatedNonMember() throws Exception {
        long eventId = masterclassId();
        String content = "Message from a nonmember";

        try (HttpClient client = HttpClient.newHttpClient(); StompConnection connection = open(client)) {
            connection.connect("CONNECT", List.of(AUTHORIZATION_HEADER + tokens.bearer(NON_MEMBER)));
            assertThat(connection.receiveFrame()).startsWith("CONNECTED\n");
            connection.send("SUBSCRIBE", List.of("id:errors", "destination:/user" + ERROR_QUEUE), "");
            await().atMost(Duration.ofSeconds(TIMEOUT_SECONDS)).until(() -> {
                messaging.convertAndSendToUser(Long.toString(NON_MEMBER), ERROR_QUEUE, SUBSCRIPTION_PROBE);
                return connection.frames.poll(100, TimeUnit.MILLISECONDS) != null;
            });

            sendChatWithConflictingCredentials(connection, eventId, MEMBER, content);

            String frame = connection.receiveFrame();
            while (frame.endsWith(SUBSCRIPTION_PROBE + '\0')) {
                frame = connection.receiveFrame();
            }
            assertThat(frame).startsWith("MESSAGE\n");
            String body = frame.substring(frame.indexOf("\n\n") + 2, frame.length() - 1);
            assertThat(JsonPath.parse(body).read("$.status", Integer.class)).isEqualTo(403);
            assertThat(JsonPath.parse(body).read("$.message", String.class)).isEqualTo("NOT_GOING");
            assertThat(jdbc.queryForList("SELECT user_id FROM chat_messages WHERE event_id = ? AND content = ?",
                    Long.class, eventId, content)).isEmpty();
        }
    }

    @Test
    void deliversChatToAnAuthorizedSubscriber() throws Exception {
        long eventId = masterclassId();
        String content = "Message delivered to the event subscription";
        try (HttpClient client = HttpClient.newHttpClient(); StompConnection connection = open(client)) {
            connectAs(connection, MEMBER);
            subscribeToChat(connection, eventId);
            sendChatWithConflictingCredentials(connection, eventId, NON_MEMBER, content);

            String frame = receiveChat(connection);
            assertThat(frame).startsWith("MESSAGE\n");
            String body = frame.substring(frame.indexOf("\n\n") + 2, frame.length() - 1);
            assertThat(JsonPath.parse(body).read("$.content", String.class)).isEqualTo(content);
            assertThat(JsonPath.parse(body).read("$.userId", Long.class)).isEqualTo(MEMBER);
        } finally {
            jdbc.update("DELETE FROM chat_messages WHERE event_id = ? AND content = ?", eventId, content);
        }
    }

    @Test
    void rejectsSubscriptionsWithoutMembershipAndDestinationsOutsideTheChatAllowlist() throws Exception {
        try (HttpClient client = HttpClient.newHttpClient()) {
            for (String destination : List.of(ChatDestinations.eventTopic(masterclassId()),
                    "/topic/events/*/chat", "/queue/errors", "/user/2/queue/errors")) {
                try (StompConnection connection = open(client)) {
                    connectAs(connection, NON_MEMBER);
                    connection.send("SUBSCRIBE", List.of("id:denied", "destination:" + destination), "");
                    assertPolicyRejected(connection);
                }
            }
        }
    }

    @Test
    void rejectsDirectPublishesToBrokerDestinations() throws Exception {
        long eventId = masterclassId();
        try (HttpClient client = HttpClient.newHttpClient(); StompConnection receiver = open(client)) {
            connectAs(receiver, MEMBER);
            subscribeToChat(receiver, eventId);
            for (String destination : List.of(ChatDestinations.eventTopic(eventId), ERROR_QUEUE)) {
                try (StompConnection sender = open(client)) {
                    connectAs(sender, MEMBER);
                    sender.send("SEND", List.of("destination:" + destination), "Untrusted broadcast");
                    assertPolicyRejected(sender);
                }
            }
            assertThat(receiver.frames.stream()).noneMatch(frame -> frame.contains("Untrusted broadcast"));
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void closesAnExistingSubscriptionAfterMembershipEnds(boolean remove) throws Exception {
        long eventId = masterclassId();
        try (HttpClient client = HttpClient.newHttpClient(); StompConnection connection = open(client)) {
            connectAs(connection, MEMBER);
            subscribeToChat(connection, eventId);
            if (remove) {
                participation.remove(MEMBER, eventId);
            } else {
                participation.setStatus(MEMBER, eventId, ParticipationStatus.NOT_INTERESTED);
            }

            assertThat(connection.closed.get(TIMEOUT_SECONDS, TimeUnit.SECONDS)).isEqualTo(1008);
        } finally {
            participation.setStatus(MEMBER, eventId, ParticipationStatus.GOING);
        }
    }

    @Test
    void closesAnIdleAuthenticatedSocketWhenItsTokenExpires() throws Exception {
        try (HttpClient client = HttpClient.newHttpClient(); StompConnection connection = open(client)) {
            Instant expiry = Instant.now().plusSeconds(3).truncatedTo(ChronoUnit.SECONDS);
            String bearer = tokens.bearer(MEMBER, expiry);
            connection.connect("CONNECT", List.of(AUTHORIZATION_HEADER + bearer));
            assertThat(connection.receiveFrame()).startsWith("CONNECTED\n");
            subscribeToChat(connection, masterclassId());
            assertThat(connection.closed.isDone()).isFalse();
            assertThat(connection.closed.get(TIMEOUT_SECONDS, TimeUnit.SECONDS)).isEqualTo(1008);
            assertThat(Instant.now()).isAfterOrEqualTo(expiry);
        }
    }

    private void connectAs(StompConnection connection, long userId) throws Exception {
        connection.connect("CONNECT", List.of(AUTHORIZATION_HEADER + tokens.bearer(userId)));
        assertThat(connection.receiveFrame()).startsWith("CONNECTED\n");
    }

    private void subscribeToChat(StompConnection connection, long eventId) throws Exception {
        String destination = ChatDestinations.eventTopic(eventId);
        connection.send("SUBSCRIBE", List.of("id:chat", "destination:" + destination), "");
        await().atMost(Duration.ofSeconds(TIMEOUT_SECONDS)).until(() -> {
            messaging.convertAndSend(destination, SUBSCRIPTION_PROBE);
            String frame = connection.frames.poll(100, TimeUnit.MILLISECONDS);
            return frame != null && frame.endsWith(SUBSCRIPTION_PROBE + '\0');
        });
    }

    private static String receiveChat(StompConnection connection) throws InterruptedException {
        String frame;
        do {
            frame = connection.receiveFrame();
        } while (frame.endsWith(SUBSCRIPTION_PROBE + '\0'));
        return frame;
    }

    private static void assertPolicyRejected(StompConnection connection) throws Exception {
        assertThat(connection.receiveFrame()).startsWith("ERROR\n");
        assertThat(connection.closed.get(TIMEOUT_SECONDS, TimeUnit.SECONDS)).isEqualTo(1002);
    }

    private StompConnection open(HttpClient client) throws Exception {
        StompConnection connection = new StompConnection();
        connection.socket = client.newWebSocketBuilder().subprotocols("v12.stomp")
                .buildAsync(URI.create("ws://localhost:" + port + contextPath + "/ws"), connection)
                .get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        return connection;
    }

    private long masterclassId() {
        return jdbc.queryForObject("SELECT id FROM events WHERE title = ?", Long.class, "Pastry Masterclass");
    }

    private void sendChatWithConflictingCredentials(StompConnection connection, long eventId, long claimedUser,
                                                   String content) throws Exception {
        connection.send("SEND", List.of("destination:/app/events/" + eventId + "/chat",
                        AUTHORIZATION_HEADER + tokens.bearer(claimedUser), LEGACY_HEADER + claimedUser,
                        "content-type:application/json"),
                "{\"content\":\"" + content + "\"}");
    }

    private static class StompConnection implements WebSocket.Listener, AutoCloseable {

        private final BlockingQueue<String> frames = new LinkedBlockingQueue<>();
        private final CompletableFuture<Integer> closed = new CompletableFuture<>();
        private final StringBuilder inbound = new StringBuilder();
        private WebSocket socket;

        void connect(String command, List<String> authenticationHeaders) throws Exception {
            List<String> headers = new ArrayList<>(List.of("accept-version:1.2", "host:localhost"));
            headers.addAll(authenticationHeaders);
            send(command, headers, "");
        }

        void send(String command, List<String> headers, String body) throws Exception {
            socket.sendText(command + "\n" + String.join("\n", headers) + "\n\n" + body + '\0', true)
                    .get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        }

        String receiveFrame() throws InterruptedException {
            String frame = frames.poll(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            assertThat(frame).as("STOMP frame").isNotNull();
            return frame;
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            inbound.append(data);
            if (last) {
                frames.add(inbound.toString());
                inbound.setLength(0);
            }
            webSocket.request(1);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            closed.complete(statusCode);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public void close() {
            socket.abort();
        }
    }
}
