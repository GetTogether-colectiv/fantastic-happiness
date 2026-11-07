package com.gettogether.chat.internal;

import com.gettogether.TestcontainersConfiguration;
import com.gettogether.shared.ForbiddenException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ChatTests {

    private static final String USER_ID_HEADER = "X-User-Id";
    private static final long GOING_USER = 1L;
    private static final long OTHER_USER = 2L;
    private static final Instant OLDER_SENT_AT = Instant.parse("2026-01-01T10:00:00Z");
    private static final Instant NEWER_SENT_AT = Instant.parse("2026-01-01T11:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ChatService chatService;

    private Long eventId;

    @BeforeEach
    void createEventWithOneParticipant() {
        eventId = jdbc.queryForObject("""
                INSERT INTO events (title, category, starts_at, ends_at, city, location_name, organizer_id)
                VALUES ('Chat test', 'OTHER', now() + interval '1 day', now() + interval '2 days',
                        'Cluj-Napoca', 'Test location', ?)
                RETURNING id
                """, Long.class, GOING_USER);
        jdbc.update("INSERT INTO participations (user_id, event_id, status) VALUES (?, ?, 'GOING')",
                GOING_USER, eventId);
    }

    @AfterEach
    void removeTestData() {
        jdbc.update("DELETE FROM chat_messages WHERE event_id = ?", eventId);
        jdbc.update("DELETE FROM participations WHERE event_id = ?", eventId);
        jdbc.update("DELETE FROM events WHERE id = ?", eventId);
    }

    @Test
    void savesMessageFromGoingUserWithAuthorDetails() {
        ChatMessageDto message = chatService.save(eventId, GOING_USER, "Hello");

        assertThat(message.id()).isNotNull();
        assertThat(message.content()).isEqualTo("Hello");
        assertThat(message.userName()).isNotBlank();
        assertThat(countMessages()).isEqualTo(1);
    }

    @Test
    void rejectsMessageFromUserWhoIsNotGoing() {
        assertThatThrownBy(() -> chatService.save(eventId, OTHER_USER, "Hello"))
                .isInstanceOf(ForbiddenException.class);
        assertThat(countMessages()).isZero();
    }

    @Test
    void returnsHistoryNewestFirstAndOnlyOlderMessagesWithBefore() throws Exception {
        insertMessage("First", OLDER_SENT_AT);
        insertMessage("Second", NEWER_SENT_AT);

        mockMvc.perform(get(messagesUrl()).header(USER_ID_HEADER, GOING_USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].content").value("Second"))
                .andExpect(jsonPath("$[1].content").value("First"));

        mockMvc.perform(get(messagesUrl()).param("before", NEWER_SENT_AT.toString())
                        .header(USER_ID_HEADER, GOING_USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].content").value("First"));
    }

    @Test
    void countsMessagesForGoingUser() throws Exception {
        insertMessage("First", OLDER_SENT_AT);
        insertMessage("Second", NEWER_SENT_AT);

        mockMvc.perform(get(messagesUrl() + "/count").header(USER_ID_HEADER, GOING_USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(2));
    }

    @Test
    void forbidsHistoryAndCountForUserWhoIsNotGoing() throws Exception {
        mockMvc.perform(get(messagesUrl()).header(USER_ID_HEADER, OTHER_USER))
                .andExpect(status().isForbidden());
        mockMvc.perform(get(messagesUrl() + "/count").header(USER_ID_HEADER, OTHER_USER))
                .andExpect(status().isForbidden());
    }

    private void insertMessage(String content, Instant sentAt) {
        jdbc.update("INSERT INTO chat_messages (event_id, user_id, content, sent_at) VALUES (?, ?, ?, ?)",
                eventId, GOING_USER, content, Timestamp.from(sentAt));
    }

    private int countMessages() {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM chat_messages WHERE event_id = ?",
                Integer.class, eventId);
        return count == null ? 0 : count;
    }

    private String messagesUrl() {
        return "/events/" + eventId + "/messages";
    }
}