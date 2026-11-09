package com.gettogether.events;

import com.gettogether.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.nullValue;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@RecordApplicationEvents
class EventManagementTests {

    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String TEST_TITLE_PREFIX = "Management test";
    private static final long ORGANIZER = 1L;
    private static final long OTHER_USER = 2L;
    private static final long UNKNOWN_EVENT_ID = 999_999L;
    private static final double LATITUDE = 46.77;
    private static final double LONGITUDE = 23.59;
    private static final int CAPACITY = 30;
    private static final long EVENT_LENGTH_HOURS = 2;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ApplicationEvents applicationEvents;

    @AfterEach
    void removeTestEvents() {
        jdbc.update("DELETE FROM events WHERE title LIKE ?", TEST_TITLE_PREFIX + "%");
    }

    @Test
    void createsAnEventOrganizedByTheCurrentUserThatAppearsInTheList() throws Exception {
        Instant startsAt = Instant.parse("2998-06-01T10:00:00Z");
        String title = TEST_TITLE_PREFIX + " create";

        create(OTHER_USER, eventJson(title, startsAt, startsAt.plus(EVENT_LENGTH_HOURS, ChronoUnit.HOURS),
                String.valueOf(CAPACITY)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.title").value(title))
                .andExpect(jsonPath("$.organizerId").value(OTHER_USER))
                .andExpect(jsonPath("$.capacity").value(CAPACITY))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());

        mockMvc.perform(get("/events").param("from", startsAt.toString()).param("to", startsAt.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value(title));
    }

    @Test
    void allowsAnEventWithoutACapacityLimit() throws Exception {
        create(OTHER_USER, validJson(TEST_TITLE_PREFIX + " unlimited", "null"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.capacity").value(nullValue()));
    }

    @Test
    void ignoresAnOrganizerSentInTheBody() throws Exception {
        String json = validJson(TEST_TITLE_PREFIX + " organizer", "10").replace("{", "{ \"organizerId\": 3,");

        create(OTHER_USER, json)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.organizerId").value(OTHER_USER));
    }

    @Test
    void requiresACurrentUser() throws Exception {
        mockMvc.perform(post("/events").contentType(MediaType.APPLICATION_JSON)
                        .content(validJson(TEST_TITLE_PREFIX + " anonymous", "10")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsABlankTitle() throws Exception {
        Instant startsAt = Instant.now().plus(1, ChronoUnit.DAYS);

        create(OTHER_USER, eventJson(" ", startsAt, startsAt.plus(EVENT_LENGTH_HOURS, ChronoUnit.HOURS), "10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title").value("Title is required"));
    }

    @Test
    void rejectsAStartInThePast() throws Exception {
        Instant startsAt = Instant.now().minus(1, ChronoUnit.DAYS);

        create(OTHER_USER, eventJson(TEST_TITLE_PREFIX + " past", startsAt,
                startsAt.plus(EVENT_LENGTH_HOURS, ChronoUnit.HOURS), "10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.startsAt").value("Start can't be in the past"));
    }

    @Test
    void rejectsAnEndThatIsNotAfterTheStart() throws Exception {
        Instant startsAt = Instant.now().plus(1, ChronoUnit.DAYS);

        create(OTHER_USER, eventJson(TEST_TITLE_PREFIX + " same", startsAt, startsAt, "10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.endsAt").value("End must be after start"));
        create(OTHER_USER, eventJson(TEST_TITLE_PREFIX + " before", startsAt,
                startsAt.minus(1, ChronoUnit.HOURS), "10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.endsAt").value("End must be after start"));
    }

    @Test
    void rejectsANonPositiveCapacity() throws Exception {
        create(OTHER_USER, validJson(TEST_TITLE_PREFIX + " capacity", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.capacity").value("Capacity must be a positive number"));
    }

    @Test
    void rejectsMissingRequiredFields() throws Exception {
        create(OTHER_USER, "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title").exists())
                .andExpect(jsonPath("$.fieldErrors.category").exists())
                .andExpect(jsonPath("$.fieldErrors.startsAt").exists())
                .andExpect(jsonPath("$.fieldErrors.endsAt").exists())
                .andExpect(jsonPath("$.fieldErrors.locationName").exists())
                .andExpect(jsonPath("$.fieldErrors.city").exists());
    }

    @Test
    void publishesEventCreated() throws Exception {
        MvcResult result = create(OTHER_USER, validJson(TEST_TITLE_PREFIX + " published", "10"))
                .andExpect(status().isCreated())
                .andReturn();
        Number id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");

        assertThat(applicationEvents.stream(EventCreated.class)).singleElement().satisfies(event -> {
            assertThat(event.eventId()).isEqualTo(id.longValue());
            assertThat(event.category()).isEqualTo("TECH");
            assertThat(event.organizerId()).isEqualTo(OTHER_USER);
        });
    }

    @Test
    void letsTheOrganizerEditAndKeepsTheMapPosition() throws Exception {
        Long eventId = insertEvent();
        String title = TEST_TITLE_PREFIX + " edited";

        edit(eventId, ORGANIZER, validJson(title, "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(eventId))
                .andExpect(jsonPath("$.title").value(title))
                .andExpect(jsonPath("$.capacity").value(10));

        assertThat(jdbc.queryForObject("SELECT title FROM events WHERE id = ?", String.class, eventId))
                .isEqualTo(title);
        assertThat(jdbc.queryForObject("SELECT latitude FROM events WHERE id = ?", Double.class, eventId))
                .isEqualTo(LATITUDE);
        assertThat(jdbc.queryForObject("SELECT longitude FROM events WHERE id = ?", Double.class, eventId))
                .isEqualTo(LONGITUDE);
    }

    @Test
    void forbidsEditingAnotherUsersEvent() throws Exception {
        Long eventId = insertEvent();

        edit(eventId, OTHER_USER, validJson(TEST_TITLE_PREFIX + " hijacked", "10"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        assertThat(jdbc.queryForObject("SELECT title FROM events WHERE id = ?", String.class, eventId))
                .isEqualTo(TEST_TITLE_PREFIX + " seed");
    }

    @Test
    void returnsNotFoundWhenEditingAnUnknownEvent() throws Exception {
        edit(UNKNOWN_EVENT_ID, ORGANIZER, validJson(TEST_TITLE_PREFIX + " unknown", "10"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void rejectsInvalidDataWhenEditing() throws Exception {
        Long eventId = insertEvent();

        edit(eventId, ORGANIZER, validJson(" ", "10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title").value("Title is required"));
    }

    private ResultActions create(long userId, String json) throws Exception {
        return mockMvc.perform(post("/events").header(USER_ID_HEADER, userId)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions edit(long eventId, long userId, String json) throws Exception {
        return mockMvc.perform(put("/events/{id}", eventId).header(USER_ID_HEADER, userId)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private Long insertEvent() {
        return jdbc.queryForObject("""
                INSERT INTO events (title, category, starts_at, ends_at, city, location_name, latitude, longitude,
                                    organizer_id)
                VALUES (?, 'OTHER', now() + interval '1 day', now() + interval '2 days', 'Cluj-Napoca',
                        'Test location', ?, ?, ?)
                RETURNING id
                """, Long.class, TEST_TITLE_PREFIX + " seed", LATITUDE, LONGITUDE, ORGANIZER);
    }

    private static String validJson(String title, String capacity) {
        Instant startsAt = Instant.now().plus(1, ChronoUnit.DAYS);
        return eventJson(title, startsAt, startsAt.plus(EVENT_LENGTH_HOURS, ChronoUnit.HOURS), capacity);
    }

    private static String eventJson(String title, Instant startsAt, Instant endsAt, String capacity) {
        return """
                {
                  "title": "%s",
                  "description": "Bring snacks",
                  "category": "TECH",
                  "startsAt": "%s",
                  "endsAt": "%s",
                  "locationName": "Test location",
                  "city": "Cluj-Napoca",
                  "capacity": %s,
                  "imageUrl": null
                }
                """.formatted(title, startsAt, endsAt, capacity);
    }
}