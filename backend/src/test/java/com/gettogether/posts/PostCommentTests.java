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
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PostCommentTests {

    private static final long POST_AUTHOR_ID = 1L;
    private static final long COMMENTER_ID = 2L;
    private static final long OTHER_USER_ID = 3L;
    private static final long UNKNOWN_ID = 999_999L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TestJwtTokens tokens;

    @Autowired
    private JdbcTemplate jdbc;

    private Long eventId;
    private Long postId;

    @BeforeEach
    void createEventWithPost() {
        eventId = jdbc.queryForObject("""
                INSERT INTO events (title, category, starts_at, ends_at, city, location_name, organizer_id)
                VALUES ('Comment test', 'OTHER', now() - interval '2 days', now() - interval '1 day',
                        'Cluj-Napoca', 'Test location', ?)
                RETURNING id
                """, Long.class, POST_AUTHOR_ID);
        postId = jdbc.queryForObject("""
                INSERT INTO posts (user_id, event_id, rating, text)
                VALUES (?, ?, 5, 'A post to comment on')
                RETURNING id
                """, Long.class, POST_AUTHOR_ID, eventId);
    }

    @AfterEach
    void removeTestData() {
        jdbc.update("DELETE FROM posts WHERE event_id = ?", eventId);
        jdbc.update("DELETE FROM events WHERE id = ?", eventId);
    }

    @Test
    void createsCommentAsCurrentUser() throws Exception {
        createComment(COMMENTER_ID, postId, "{\"text\":\"Nice one\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.postId").value(postId))
                .andExpect(jsonPath("$.userId").value(COMMENTER_ID))
                .andExpect(jsonPath("$.authorName").value("Iulia Dragomir"))
                .andExpect(jsonPath("$.authorAvatar").isNotEmpty())
                .andExpect(jsonPath("$.text").value("Nice one"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());

        assertThat(commentCount()).isEqualTo(1);
    }

    @Test
    void trimsCommentText() throws Exception {
        createComment(COMMENTER_ID, postId, "{\"text\":\"  padded  \"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.text").value("padded"));
    }

    @Test
    void rejectsEmptyOrTooLongComments() throws Exception {
        List<String> invalidBodies = List.of(
                "{}",
                "{\"text\":\"\"}",
                "{\"text\":\"   \"}",
                "{\"text\":\"" + "x".repeat(501) + "\"}");

        for (String body : invalidBodies) {
            createComment(COMMENTER_ID, postId, body).andExpect(status().isBadRequest());
        }
        assertThat(commentCount()).isZero();
    }

    @Test
    void acceptsCommentOfMaximumLength() throws Exception {
        createComment(COMMENTER_ID, postId, "{\"text\":\"" + "x".repeat(500) + "\"}")
                .andExpect(status().isCreated());
    }

    @Test
    void rejectsCommentOnUnknownPost() throws Exception {
        createComment(COMMENTER_ID, UNKNOWN_ID, "{\"text\":\"Hello\"}").andExpect(status().isNotFound());
    }

    @Test
    void listsCommentsOldestFirstWithAuthors() throws Exception {
        insertComment(OTHER_USER_ID, "Second", "1 hour");
        insertComment(COMMENTER_ID, "First", "2 hours");

        mockMvc.perform(get("/posts/{id}/comments", postId)
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(POST_AUTHOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].text").value("First"))
                .andExpect(jsonPath("$[0].authorName").value("Iulia Dragomir"))
                .andExpect(jsonPath("$[0].authorAvatar").isNotEmpty())
                .andExpect(jsonPath("$[1].text").value("Second"))
                .andExpect(jsonPath("$[1].userId").value(OTHER_USER_ID));
    }

    @Test
    void returnsEmptyListForPostWithoutComments() throws Exception {
        mockMvc.perform(get("/posts/{id}/comments", postId)
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(POST_AUTHOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void returnsNotFoundWhenListingCommentsOfUnknownPost() throws Exception {
        mockMvc.perform(get("/posts/{id}/comments", UNKNOWN_ID)
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(POST_AUTHOR_ID)))
                .andExpect(status().isNotFound());
    }

    @Test
    void authorDeletesOwnComment() throws Exception {
        long commentId = insertComment(COMMENTER_ID, "Bye", "1 hour");

        deleteComment(COMMENTER_ID, commentId).andExpect(status().isNoContent());

        assertThat(commentCount()).isZero();
    }

    @Test
    void rejectsDeletingSomeoneElsesComment() throws Exception {
        long commentId = insertComment(COMMENTER_ID, "Mine", "1 hour");

        deleteComment(POST_AUTHOR_ID, commentId)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("NOT_COMMENT_AUTHOR"));

        assertThat(commentCount()).isEqualTo(1);
    }

    @Test
    void returnsNotFoundWhenDeletingUnknownComment() throws Exception {
        deleteComment(COMMENTER_ID, UNKNOWN_ID).andExpect(status().isNotFound());
    }

    @Test
    void postListingIncludesCommentCounts() throws Exception {
        insertComment(COMMENTER_ID, "One", "2 hours");
        insertComment(OTHER_USER_ID, "Two", "1 hour");
        Long otherPostId = jdbc.queryForObject("""
                INSERT INTO posts (user_id, event_id, rating, text, created_at)
                VALUES (?, ?, 3, 'No comments here', now() - interval '3 hours')
                RETURNING id
                """, Long.class, COMMENTER_ID, eventId);

        mockMvc.perform(get("/events/{id}/posts", eventId)
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(POST_AUTHOR_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts[?(@.id == " + postId + ")].commentCount").value(2))
                .andExpect(jsonPath("$.posts[?(@.id == " + otherPostId + ")].commentCount").value(0));
    }

    @Test
    void deletingPostRemovesItsComments() {
        insertComment(COMMENTER_ID, "Gone with the post", "1 hour");

        jdbc.update("DELETE FROM posts WHERE id = ?", postId);

        assertThat(commentCount()).isZero();
    }

    private ResultActions createComment(long userId, long targetPostId, String body) throws Exception {
        return mockMvc.perform(post("/posts/{id}/comments", targetPostId)
                .header(HttpHeaders.AUTHORIZATION, tokens.bearer(userId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions deleteComment(long userId, long commentId) throws Exception {
        return mockMvc.perform(delete("/comments/{id}", commentId)
                .header(HttpHeaders.AUTHORIZATION, tokens.bearer(userId)));
    }

    private long insertComment(long userId, String text, String age) {
        return jdbc.queryForObject("""
                INSERT INTO post_comments (post_id, user_id, text, created_at)
                VALUES (?, ?, ?, now() - CAST(? AS interval))
                RETURNING id
                """, Long.class, postId, userId, text, age);
    }

    private int commentCount() {
        return jdbc.queryForObject("SELECT count(*) FROM post_comments WHERE post_id = ?", Integer.class, postId);
    }
}
