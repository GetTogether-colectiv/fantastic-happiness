package com.gettogether.events;

import com.gettogether.TestcontainersConfiguration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class EventParticipationTests {

    private static final String USER_ID_HEADER = "X-User-Id";
    private static final long FIRST_USER = 1L;
    private static final long SECOND_USER = 2L;
    private static final long UNKNOWN_ID = 999_999L;
    private static final int CAPACITY = 1;
    private static final int TIMEOUT_SECONDS = 10;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private Long eventId;

    @BeforeEach
    void createEvent() {
        eventId = jdbc.queryForObject("""
                INSERT INTO events (title, category, starts_at, ends_at, city, location_name, capacity, organizer_id)
                VALUES ('Participation test', 'OTHER', now() + interval '1 day', now() + interval '2 days',
                        'Cluj-Napoca', 'Test location', ?, ?)
                RETURNING id
                """, Long.class, CAPACITY, FIRST_USER);
    }

    @AfterEach
    void removeTestEvent() {
        jdbc.update("DELETE FROM participations WHERE event_id = ?", eventId);
        jdbc.update("DELETE FROM events WHERE id = ?", eventId);
    }

    @Test
    void returnsExplicitNullStatusWhenThereIsNoParticipation() throws Exception {
        mockMvc.perform(get(url()).header(USER_ID_HEADER, FIRST_USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasKey("status")))
                .andExpect(jsonPath("$.status").value(nullValue()))
                .andExpect(jsonPath("$.goingCount").value(0))
                .andExpect(jsonPath("$.capacity").value(CAPACITY));
    }

    @Test
    void insertsAndUpdatesTheSameRowAndCountsOnlyGoing() throws Exception {
        setStatus(FIRST_USER, "NOT_INTERESTED").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NOT_INTERESTED"))
                .andExpect(jsonPath("$.goingCount").value(0));
        Long participationId = jdbc.queryForObject("SELECT id FROM participations WHERE event_id = ?",
                Long.class, eventId);

        setStatus(FIRST_USER, "GOING").andExpect(status().isOk())
                .andExpect(jsonPath("$.goingCount").value(1));
        setStatus(FIRST_USER, "GOING").andExpect(status().isOk());
        mockMvc.perform(get(url()).header(USER_ID_HEADER, FIRST_USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("GOING"));

        assertThat(rowCount()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT id FROM participations WHERE event_id = ?",
                Long.class, eventId)).isEqualTo(participationId);
        assertThat(jdbc.queryForObject("SELECT created_at IS NOT NULL FROM participations WHERE event_id = ?",
                Boolean.class, eventId)).isTrue();

        setStatus(FIRST_USER, "NOT_INTERESTED").andExpect(status().isOk())
                .andExpect(jsonPath("$.goingCount").value(0));
        setStatus(SECOND_USER, "GOING").andExpect(status().isOk());
    }

    @Test
    void rejectsJoiningAFullEventWithoutChangingExistingStatus() throws Exception {
        setStatus(FIRST_USER, "GOING").andExpect(status().isOk());
        setStatus(SECOND_USER, "GOING").andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("EVENT_FULL"));
        assertThat(rowCount()).isEqualTo(1);

        setStatus(SECOND_USER, "NOT_INTERESTED").andExpect(status().isOk());
        setStatus(SECOND_USER, "GOING").andExpect(status().isConflict());
        mockMvc.perform(get(url()).header(USER_ID_HEADER, SECOND_USER))
                .andExpect(jsonPath("$.status").value("NOT_INTERESTED"))
                .andExpect(jsonPath("$.goingCount").value(1));
    }

    @Test
    void allowsJoiningWithoutACapacityLimit() throws Exception {
        jdbc.update("UPDATE events SET capacity = NULL WHERE id = ?", eventId);
        setStatus(FIRST_USER, "GOING").andExpect(status().isOk());
        setStatus(SECOND_USER, "GOING").andExpect(status().isOk())
                .andExpect(jsonPath("$.goingCount").value(2))
                .andExpect(jsonPath("$.capacity").value(nullValue()));
    }

    @Test
    void deletesOnlyTheCurrentUsersRowAndAllowsRepeatedDelete() throws Exception {
        setStatus(FIRST_USER, "GOING").andExpect(status().isOk());
        setStatus(SECOND_USER, "NOT_INTERESTED").andExpect(status().isOk());
        for (int attempt = 0; attempt < 2; attempt++) {
            mockMvc.perform(delete(url()).header(USER_ID_HEADER, FIRST_USER))
                    .andExpect(status().isNoContent());
        }
        assertThat(rowCount()).isEqualTo(1);
        mockMvc.perform(get(url()).header(USER_ID_HEADER, FIRST_USER))
                .andExpect(jsonPath("$.status").value(nullValue()))
                .andExpect(jsonPath("$.goingCount").value(0));
        mockMvc.perform(get(url()).header(USER_ID_HEADER, SECOND_USER))
                .andExpect(jsonPath("$.status").value("NOT_INTERESTED"));
        setStatus(SECOND_USER, "GOING").andExpect(status().isOk());
    }

    @Test
    void rejectsMissingNullAndInvalidStatuses() throws Exception {
        for (String body : List.of("{}", "{\"status\":null}", "{\"status\":\"INVALID\"}")) {
            mockMvc.perform(put(url()).header(USER_ID_HEADER, FIRST_USER)
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        assertThat(rowCount()).isZero();
    }

    @Test
    void requiresAValidCurrentUserForEveryEndpoint() throws Exception {
        for (var request : List.of(get(url()), put(url()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"GOING\"}"), delete(url()))) {
            mockMvc.perform(request).andExpect(status().isUnauthorized());
            mockMvc.perform(request.header(USER_ID_HEADER, "invalid")).andExpect(status().isUnauthorized());
        }
        mockMvc.perform(get(url()).header(USER_ID_HEADER, UNKNOWN_ID)).andExpect(status().isNotFound());
    }

    @Test
    void returnsNotFoundForUnknownEvents() throws Exception {
        String missingUrl = "/events/" + UNKNOWN_ID + "/participation";
        for (var request : List.of(get(missingUrl), delete(missingUrl),
                put(missingUrl).contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"GOING\"}"))) {
            mockMvc.perform(request.header(USER_ID_HEADER, FIRST_USER)).andExpect(status().isNotFound());
        }
    }

    @Test
    void concurrentJoinsCannotExceedCapacity() throws Exception {
        assertThat(concurrentJoins(FIRST_USER, SECOND_USER)).containsExactlyInAnyOrder(200, 409);
        assertThat(rowCount()).isEqualTo(CAPACITY);
    }

    @Test
    void concurrentRepeatedJoinsDoNotCreateDuplicates() throws Exception {
        assertThat(concurrentJoins(FIRST_USER, FIRST_USER)).containsExactly(200, 200);
        assertThat(rowCount()).isEqualTo(1);
    }

    private List<Integer> concurrentJoins(long firstUser, long secondUser) throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var requests = List.of(firstUser, secondUser).stream().map(userId -> executor.submit(() -> {
                ready.countDown();
                if (!start.await(TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Timed out waiting to start concurrent joins");
                }
                return setStatus(userId, "GOING").andReturn().getResponse().getStatus();
            })).toList();
            try {
                assertThat(ready.await(TIMEOUT_SECONDS, TimeUnit.SECONDS)).isTrue();
            } finally {
                start.countDown();
            }
            return List.of(requests.get(0).get(TIMEOUT_SECONDS, TimeUnit.SECONDS),
                    requests.get(1).get(TIMEOUT_SECONDS, TimeUnit.SECONDS));
        }
    }

    private ResultActions setStatus(long userId, String participationStatus) throws Exception {
        return mockMvc.perform(put(url()).header(USER_ID_HEADER, userId).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"" + participationStatus + "\"}"));
    }

    private int rowCount() {
        return jdbc.queryForObject("SELECT count(*) FROM participations WHERE event_id = ?", Integer.class, eventId);
    }

    private String url() {
        return "/events/" + eventId + "/participation";
    }
}
