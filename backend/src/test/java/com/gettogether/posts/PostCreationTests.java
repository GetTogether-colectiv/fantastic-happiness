package com.gettogether.posts;

import com.gettogether.TestJwtTokens;
import com.gettogether.TestcontainersConfiguration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PostCreationTests {

    private static final long ATTENDEE_ID = 1L;
    private static final long NON_ATTENDEE_ID = 2L;
    private static final long UNKNOWN_EVENT_ID = 999_999L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TestJwtTokens tokens;

    @Autowired
    private JdbcTemplate jdbc;

    private Long eventId;

    @BeforeEach
    void createEndedEventWithAttendee() {
        eventId = jdbc.queryForObject("""
                INSERT INTO events (title, category, starts_at, ends_at, city, location_name, organizer_id)
                VALUES ('Post creation test', 'OTHER', now() - interval '2 days', now() - interval '1 day',
                        'Cluj-Napoca', 'Test location', ?)
                RETURNING id
                """, Long.class, ATTENDEE_ID);
        jdbc.update("""
                INSERT INTO participations (user_id, event_id, status)
                VALUES (?, ?, 'GOING')
                """, ATTENDEE_ID, eventId);
    }

    @AfterEach
    void removeTestData() {
        jdbc.update("DELETE FROM posts WHERE event_id = ?", eventId);
        jdbc.update("DELETE FROM participations WHERE event_id = ?", eventId);
        jdbc.update("DELETE FROM events WHERE id = ?", eventId);
    }

    @Test
    void createsPostForAttendedEndedEvent() throws Exception {
        createPost(ATTENDEE_ID, eventId, "{\"rating\":5,\"text\":\"A great event\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.userId").value(ATTENDEE_ID))
                .andExpect(jsonPath("$.eventId").value(eventId))
                .andExpect(jsonPath("$.authorName").value("Alexandra Pop"))
                .andExpect(jsonPath("$.authorAvatar").isNotEmpty())
                .andExpect(jsonPath("$.rating").value(5))
                .andExpect(jsonPath("$.text").value("A great event"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());

        assertThat(postCount()).isEqualTo(1);
    }

    @Test
    void rejectsPostBeforeEventHasEnded() throws Exception {
        jdbc.update("""
                UPDATE events
                SET starts_at = now() + interval '1 day', ends_at = now() + interval '2 days'
                WHERE id = ?
                """, eventId);

        createPost(ATTENDEE_ID, eventId, "{\"rating\":4}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("EVENT_NOT_ENDED"));
        assertThat(postCount()).isZero();
    }

    @Test
    void rejectsPostFromUserWhoWasNotGoing() throws Exception {
        createPost(NON_ATTENDEE_ID, eventId, "{\"rating\":4}")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("NOT_GOING"));
        assertThat(postCount()).isZero();
    }

    @Test
    void rejectsSecondPostBySameUserForEvent() throws Exception {
        createPost(ATTENDEE_ID, eventId, "{\"rating\":4}").andExpect(status().isCreated());
        createPost(ATTENDEE_ID, eventId, "{\"rating\":2}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("POST_ALREADY_EXISTS"));

        assertThat(postCount()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT rating FROM posts WHERE event_id = ?", Integer.class, eventId))
                .isEqualTo(4);
    }

    @Test
    void validatesRatingAndText() throws Exception {
        String tooLongText = "x".repeat(1001);
        List<String> invalidBodies = List.of(
                "{}",
                "{\"rating\":0}",
                "{\"rating\":6}",
                "{\"rating\":3,\"text\":\"" + tooLongText + "\"}");

        for (String body : invalidBodies) {
            createPost(ATTENDEE_ID, eventId, body).andExpect(status().isBadRequest());
        }
        assertThat(postCount()).isZero();
    }

    @Test
    void returnsNotFoundForUnknownEvent() throws Exception {
        createPost(ATTENDEE_ID, UNKNOWN_EVENT_ID, "{\"rating\":4}")
                .andExpect(status().isNotFound());
    }

    private ResultActions createPost(long userId, long targetEventId, String body) throws Exception {
        return mockMvc.perform(post("/events/{id}/posts", targetEventId)
                .header(HttpHeaders.AUTHORIZATION, tokens.bearer(userId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private int postCount() {
        return jdbc.queryForObject("SELECT count(*) FROM posts WHERE event_id = ?", Integer.class, eventId);
    }
}
