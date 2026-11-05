package com.gettogether.events;

import com.gettogether.TestcontainersConfiguration;
import com.gettogether.participation.ParticipationApi;
import com.gettogether.participation.ParticipationStatus;
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
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class SwipeFeedTests {

    private static final String FEED_URL = "/participation/feed";
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final long USER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;
    private static final long UNKNOWN_USER_ID = 999_999L;
    private static final int EVENT_COUNT = 12;
    private static final int DEFAULT_SIZE = 10;
    private static final int LARGE_SIZE = 100;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ParticipationApi participationApi;

    @Autowired
    private EventsApi eventsApi;

    private List<Long> existingEventIds;
    private final List<Long> feedEventIds = new ArrayList<>();

    @BeforeEach
    void createFeedEvents() {
        existingEventIds = jdbc.queryForList("SELECT id FROM events", Long.class);
        // Hide seed events for this user only. The test transaction rolls all changes back.
        existingEventIds.forEach(id -> participationApi.setStatus(USER_ID, id, ParticipationStatus.NOT_INTERESTED));
        Instant firstStart = Instant.now().plus(1, ChronoUnit.HOURS);
        for (int index = 0; index < EVENT_COUNT; index++) {
            // The first two events share a start time to exercise the ID tie-breaker.
            feedEventIds.add(createEvent(firstStart.plus(index < 2 ? 0 : index, ChronoUnit.MINUTES)));
        }
    }

    @Test
    void defaultsToTenEventsAndReturnsEventSummaries() throws Exception {
        mockMvc.perform(get(FEED_URL).header(USER_ID_HEADER, USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(DEFAULT_SIZE)))
                .andExpect(jsonPath("$[0].id").value(feedEventIds.getFirst()))
                .andExpect(jsonPath("$[0].title").value("Swipe feed test"))
                .andExpect(jsonPath("$[0].category").value("OTHER"))
                .andExpect(jsonPath("$[0].startsAt").isNotEmpty())
                .andExpect(jsonPath("$[0].capacity").value(LARGE_SIZE))
                .andExpect(jsonPath("$[0].goingCount").value(0));
    }

    @Test
    void acceptsCustomSizesWithoutAddingAnUpperCap() throws Exception {
        feed(1).andExpect(jsonPath("$", hasSize(1)));
        feed(3).andExpect(jsonPath("$", hasSize(3)));
        feed(LARGE_SIZE).andExpect(jsonPath("$", hasSize(EVENT_COUNT)));
    }

    @Test
    void rejectsNonPositiveAndInvalidSizes() throws Exception {
        for (String size : List.of("0", "-1", "invalid", "1.5", "2147483648")) {
            mockMvc.perform(get(FEED_URL).header(USER_ID_HEADER, USER_ID).param("size", size))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void excludesBothStatusesBeforeApplyingTheLimit() throws Exception {
        participationApi.setStatus(USER_ID, feedEventIds.get(0), ParticipationStatus.GOING);
        participationApi.setStatus(USER_ID, feedEventIds.get(1), ParticipationStatus.NOT_INTERESTED);

        expectIds(feed(DEFAULT_SIZE), feedEventIds.subList(2, EVENT_COUNT));
    }

    @Test
    void otherUsersDecisionsDoNotExcludeEventsAndGoingCountsAreReused() throws Exception {
        participationApi.setStatus(OTHER_USER_ID, feedEventIds.get(0), ParticipationStatus.GOING);
        participationApi.setStatus(OTHER_USER_ID, feedEventIds.get(1), ParticipationStatus.NOT_INTERESTED);

        ResultActions response = feed(LARGE_SIZE);
        expectIds(response, feedEventIds);
        response
                .andExpect(jsonPath("$[0].goingCount").value(1))
                .andExpect(jsonPath("$[1].goingCount").value(0));
    }

    @Test
    void excludesOngoingAndPastEventsFromBothTheFeedAndPublicApi() throws Exception {
        createEvent(Instant.now().minus(30, ChronoUnit.MINUTES));
        createEvent(Instant.now().minus(2, ChronoUnit.DAYS));
        createEvent(Instant.now());

        expectIds(feed(LARGE_SIZE), feedEventIds);
        assertThat(eventsApi.findUpcoming(existingEventIds, LARGE_SIZE))
                .extracting(EventSummary::id).containsExactlyElementsOf(feedEventIds);
    }

    @Test
    void publicApiFiltersBeforeLimitingAndOrdersByStartThenId() {
        List<Long> excludedIds = new ArrayList<>(existingEventIds);
        excludedIds.add(feedEventIds.getFirst());
        assertThat(eventsApi.findUpcoming(excludedIds, 3)).extracting(EventSummary::id)
                .containsExactlyElementsOf(feedEventIds.subList(1, 4));
        assertThat(eventsApi.findUpcoming(existingEventIds, EVENT_COUNT)).extracting(EventSummary::id)
                .containsExactlyElementsOf(feedEventIds);
    }

    @Test
    void ordersByStartTimeBeforeId() throws Exception {
        Long lastCreatedEvent = feedEventIds.getLast();
        jdbc.update("UPDATE events SET starts_at = ? WHERE id = ?",
                Timestamp.from(Instant.now().plus(30, ChronoUnit.MINUTES)), lastCreatedEvent);

        feed(1).andExpect(jsonPath("$[0].id").value(lastCreatedEvent));
        assertThat(eventsApi.findUpcoming(existingEventIds, 1)).extracting(EventSummary::id)
                .containsExactly(lastCreatedEvent);
    }

    @Test
    void publicApiAcceptsAnEmptyExclusionSet() {
        assertThat(eventsApi.findUpcoming(List.of(), LARGE_SIZE)).isNotEmpty()
                .allSatisfy(event -> assertThat(event.startsAt()).isAfter(Instant.now()));
    }

    @Test
    void returnsAnEmptyArrayWhenAllUpcomingEventsAreSwiped() throws Exception {
        feedEventIds.forEach(id -> participationApi.setStatus(USER_ID, id, ParticipationStatus.NOT_INTERESTED));

        feed(DEFAULT_SIZE).andExpect(jsonPath("$", hasSize(0)));
        List<Long> excludedIds = new ArrayList<>(existingEventIds);
        excludedIds.addAll(feedEventIds);
        assertThat(eventsApi.findUpcoming(excludedIds, DEFAULT_SIZE)).isEmpty();
    }

    @Test
    void newSwipesDisappearAndDeletingTheDecisionAllowsTheEventToReappear() throws Exception {
        Long eventId = feedEventIds.getFirst();
        feed(1).andExpect(jsonPath("$[0].id").value(eventId));
        mockMvc.perform(put("/events/{id}/participation", eventId).header(USER_ID_HEADER, USER_ID)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"GOING\"}"))
                .andExpect(status().isOk());
        expectIds(feed(LARGE_SIZE), feedEventIds.subList(1, EVENT_COUNT));

        mockMvc.perform(delete("/events/{id}/participation", eventId).header(USER_ID_HEADER, USER_ID))
                .andExpect(status().isNoContent());
        feed(1).andExpect(jsonPath("$[0].id").value(eventId));
    }

    @Test
    void requiresAValidCurrentUser() throws Exception {
        mockMvc.perform(get(FEED_URL)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(FEED_URL).header(USER_ID_HEADER, "invalid")).andExpect(status().isUnauthorized());
        mockMvc.perform(get(FEED_URL).header(USER_ID_HEADER, UNKNOWN_USER_ID)).andExpect(status().isNotFound());
    }

    private ResultActions feed(int size) throws Exception {
        return mockMvc.perform(get(FEED_URL).header(USER_ID_HEADER, USER_ID).param("size", String.valueOf(size)))
                .andExpect(status().isOk());
    }

    private Long createEvent(Instant startsAt) {
        return jdbc.queryForObject("""
                INSERT INTO events (title, category, starts_at, ends_at, city, location_name, capacity, organizer_id)
                VALUES ('Swipe feed test', 'OTHER', ?, ?, 'Cluj-Napoca', 'Test location', ?, ?)
                RETURNING id
                """, Long.class, Timestamp.from(startsAt), Timestamp.from(startsAt.plus(1, ChronoUnit.HOURS)),
                LARGE_SIZE, USER_ID);
    }

    private void expectIds(ResultActions response, List<Long> ids) throws Exception {
        response.andExpect(jsonPath("$", hasSize(ids.size())));
        for (int index = 0; index < ids.size(); index++) {
            response.andExpect(jsonPath("$[" + index + "].id").value(ids.get(index)));
        }
    }
}
