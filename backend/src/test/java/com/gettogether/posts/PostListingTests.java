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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PostListingTests {

    private static final long REQUESTING_USER_ID = 1L;
    private static final long UNKNOWN_EVENT_ID = 999_999L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TestJwtTokens tokens;

    @Autowired
    private JdbcTemplate jdbc;

    private Long eventId;

    @BeforeEach
    void createEvent() {
        eventId = jdbc.queryForObject("""
                INSERT INTO events (title, category, starts_at, ends_at, city, location_name, organizer_id)
                VALUES ('Post listing test', 'OTHER', now() - interval '2 days', now() - interval '1 day',
                        'Cluj-Napoca', 'Test location', ?)
                RETURNING id
                """, Long.class, REQUESTING_USER_ID);
    }

    @AfterEach
    void removeTestData() {
        jdbc.update("DELETE FROM posts WHERE event_id = ?", eventId);
        jdbc.update("DELETE FROM events WHERE id = ?", eventId);
    }

    @Test
    void listsNewestPostsWithRoundedAverageCountAndAuthors() throws Exception {
        insertPost(1L, 5, "Oldest", "3 hours");
        insertPost(2L, 4, "Newest", "1 hour");
        insertPost(3L, 2, "Middle", "2 hours");

        mockMvc.perform(get("/events/{id}/posts", eventId)
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(REQUESTING_USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageRating").value(3.7))
                .andExpect(jsonPath("$.count").value(3))
                .andExpect(jsonPath("$.posts", hasSize(3)))
                .andExpect(jsonPath("$.posts[0].userId").value(2))
                .andExpect(jsonPath("$.posts[0].authorName").value("Iulia Dragomir"))
                .andExpect(jsonPath("$.posts[0].authorAvatar").isNotEmpty())
                .andExpect(jsonPath("$.posts[0].text").value("Newest"))
                .andExpect(jsonPath("$.posts[1].userId").value(3))
                .andExpect(jsonPath("$.posts[1].text").value("Middle"))
                .andExpect(jsonPath("$.posts[2].userId").value(1))
                .andExpect(jsonPath("$.posts[2].text").value("Oldest"));
    }

    @Test
    void returnsEmptySummaryWhenEventHasNoPosts() throws Exception {
        mockMvc.perform(get("/events/{id}/posts", eventId)
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(REQUESTING_USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageRating").value(nullValue()))
                .andExpect(jsonPath("$.count").value(0))
                .andExpect(jsonPath("$.posts", hasSize(0)));
    }

    @Test
    void returnsNotFoundForUnknownEvent() throws Exception {
        mockMvc.perform(get("/events/{id}/posts", UNKNOWN_EVENT_ID)
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(REQUESTING_USER_ID)))
                .andExpect(status().isNotFound());
    }

    private void insertPost(long userId, int rating, String text, String age) {
        jdbc.update("""
                INSERT INTO posts (user_id, event_id, rating, text, created_at)
                VALUES (?, ?, ?, ?, now() - CAST(? AS interval))
                """, userId, eventId, rating, text, age);
    }
}
