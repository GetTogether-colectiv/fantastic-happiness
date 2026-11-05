package com.gettogether.participation;

import com.gettogether.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ParticipationSeedTests {

    private static final int SEEDED_USER_COUNT = 14;
    private static final int GOING_COUNT = 90;
    private static final int FULL_CAPACITY = 6;
    private static final long NON_ATTENDING_USER = 1L;
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String FULL_EVENT_TITLE = "Pastry Masterclass";
    private static final List<String> UPCOMING_TITLES = List.of(
            "Indie Night at Form Space", "Morning Run in the Park", "Cluj JS Meetup", "Board Games Night");
    private static final List<String> PAST_TITLES = List.of("Acoustic Sessions", "Book Swap");

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ParticipationApi participationApi;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void everySeededUserHasTheRequiredUpcomingAndPastGoingEvents() {
        List<Long> userIds = jdbc.queryForList("SELECT id FROM users", Long.class);
        assertThat(userIds).hasSize(SEEDED_USER_COUNT);
        for (Long userId : userIds) {
            List<String> upcoming = jdbc.queryForList("""
                    SELECT e.title FROM participations p JOIN events e ON e.id = p.event_id
                    WHERE p.user_id = ? AND p.status = 'GOING' AND e.starts_at > now()
                    """, String.class, userId);
            List<String> past = jdbc.queryForList("""
                    SELECT e.title FROM participations p JOIN events e ON e.id = p.event_id
                    WHERE p.user_id = ? AND p.status = 'GOING' AND e.ends_at < now()
                    """, String.class, userId);
            assertThat(upcoming).as("Upcoming GOING events for user %s", userId)
                    .hasSizeBetween(3, 5).containsAll(UPCOMING_TITLES);
            assertThat(past).as("Past GOING events for user %s", userId)
                    .hasSizeBetween(2, 3).containsAll(PAST_TITLES);
        }
    }

    @Test
    void seedsExactlyNinetyParticipationsAllGoing() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM participations", Integer.class)).isEqualTo(GOING_COUNT);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM participations WHERE status = 'GOING'", Integer.class))
                .isEqualTo(GOING_COUNT);
    }

    @Test
    void hasNoDuplicateUserEventPairs() {
        assertThat(jdbc.queryForList("""
                SELECT user_id, event_id FROM participations
                GROUP BY user_id, event_id HAVING count(*) > 1
                """)).isEmpty();
    }

    @Test
    void noEventExceedsItsCapacity() {
        assertThat(jdbc.queryForList("""
                SELECT e.title FROM events e JOIN participations p ON p.event_id = e.id
                WHERE p.status = 'GOING'
                GROUP BY e.id, e.title, e.capacity HAVING count(*) > e.capacity
                """, String.class)).isEmpty();
    }

    @Test
    void pastryMasterclassIsUpcomingAndFullWithTheSixIntendedUsers() {
        Long eventId = fullEventId();
        assertThat(jdbc.queryForObject("SELECT starts_at > now() FROM events WHERE id = ?", Boolean.class, eventId))
                .isTrue();
        assertThat(jdbc.queryForObject("SELECT capacity FROM events WHERE id = ?", Integer.class, eventId))
                .isEqualTo(FULL_CAPACITY);
        assertThat(participationApi.listGoingUserIds(eventId)).containsExactlyInAnyOrder(2L, 5L, 8L, 10L, 11L, 14L);
        assertThat(participationApi.findStatus(NON_ATTENDING_USER, eventId)).isEmpty();
    }

    @Test
    void rejectsUserOneJoiningFullPastryMasterclassWithoutChangingParticipations() throws Exception {
        Long eventId = fullEventId();
        String url = "/events/" + eventId + "/participation";
        List<Long> attendeesBefore = participationApi.listGoingUserIds(eventId);
        mockMvc.perform(get(url).header(USER_ID_HEADER, NON_ATTENDING_USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(nullValue()))
                .andExpect(jsonPath("$.goingCount").value(FULL_CAPACITY))
                .andExpect(jsonPath("$.capacity").value(FULL_CAPACITY));

        mockMvc.perform(put(url).header(USER_ID_HEADER, NON_ATTENDING_USER)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"GOING\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("EVENT_FULL"));

        mockMvc.perform(get(url).header(USER_ID_HEADER, NON_ATTENDING_USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(nullValue()))
                .andExpect(jsonPath("$.goingCount").value(FULL_CAPACITY))
                .andExpect(jsonPath("$.capacity").value(FULL_CAPACITY));
        assertThat(participationApi.listGoingUserIds(eventId)).containsExactlyInAnyOrderElementsOf(attendeesBefore);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM participations", Integer.class)).isEqualTo(GOING_COUNT);
    }

    private Long fullEventId() {
        return jdbc.queryForObject("SELECT id FROM events WHERE title = ?", Long.class, FULL_EVENT_TITLE);
    }
}
