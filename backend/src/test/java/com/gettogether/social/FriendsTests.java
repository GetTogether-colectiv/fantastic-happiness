package com.gettogether.social;

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
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

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
@RecordApplicationEvents
class FriendsTests {

    private static final String NAME_PREFIX = "Friendtest";
    private static final String PASSWORD_HASH = "$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.";
    private static final int SEARCH_MAX_RESULTS = 20;
    private static final long UNKNOWN_USER_ID = 999_999L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TestJwtTokens tokens;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private SocialApi socialApi;

    @Autowired
    private ApplicationEvents events;

    private final List<Long> createdUserIds = new ArrayList<>();
    private Long anna;
    private Long bogdan;
    private Long carla;

    @BeforeEach
    void createUsers() {
        anna = createUser(NAME_PREFIX + " Anna", "Cluj-Napoca");
        bogdan = createUser(NAME_PREFIX + " Bogdan", "Iasi");
        carla = createUser(NAME_PREFIX + " Carla", null);
    }

    @AfterEach
    void removeUsers() {
        for (Long userId : createdUserIds) {
            jdbc.update("DELETE FROM friendships WHERE requester_id = ? OR addressee_id = ?", userId, userId);
            jdbc.update("DELETE FROM users WHERE id = ?", userId);
        }
        createdUserIds.clear();
    }

    @Test
    void anAcceptedFriendshipShowsUpForBothUsers() throws Exception {
        long requestId = requestId(sendRequest(anna, bogdan)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING")));

        mockMvc.perform(get("/friends/requests/incoming").header(HttpHeaders.AUTHORIZATION, tokens.bearer(bogdan)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(requestId))
                .andExpect(jsonPath("$[0].user.id").value(anna))
                .andExpect(jsonPath("$[0].user.city").value("Cluj-Napoca"));
        friends(anna).andExpect(jsonPath("$", hasSize(0)));

        accept(bogdan, requestId).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACCEPTED"));

        friends(anna).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(bogdan))
                .andExpect(jsonPath("$[0].displayName").value(NAME_PREFIX + " Bogdan"))
                .andExpect(jsonPath("$[0].city").value("Iasi"));
        friends(bogdan).andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].id").value(anna));
        mockMvc.perform(get("/friends/requests/incoming").header(HttpHeaders.AUTHORIZATION, tokens.bearer(bogdan)))
                .andExpect(jsonPath("$", hasSize(0)));
        assertThat(socialApi.friendIds(anna)).containsExactly(bogdan);
        assertThat(socialApi.friendIds(bogdan)).containsExactly(anna);
    }

    @Test
    void rejectsARequestToYourself() throws Exception {
        sendRequest(anna, anna).andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        assertThat(friendshipCount()).isZero();
    }

    @Test
    void rejectsARequestWithoutAUserId() throws Exception {
        mockMvc.perform(post("/friends/requests").header(HttpHeaders.AUTHORIZATION, tokens.bearer(anna))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.userId").isNotEmpty());
    }

    @Test
    void rejectsARequestToAnUnknownUser() throws Exception {
        sendRequest(anna, UNKNOWN_USER_ID).andExpect(status().isNotFound());
    }

    @Test
    void rejectsASecondRequestToTheSamePerson() throws Exception {
        long requestId = requestId(sendRequest(anna, bogdan).andExpect(status().isCreated()));

        sendRequest(anna, bogdan).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("REQUEST_ALREADY_SENT"));

        accept(bogdan, requestId).andExpect(status().isOk());
        sendRequest(anna, bogdan).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("ALREADY_FRIENDS"));
        sendRequest(bogdan, anna).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("ALREADY_FRIENDS"));
        assertThat(friendshipCount()).isOne();
    }

    @Test
    void addingSomeoneWhoAlreadyRequestedYouAcceptsTheirRequest() throws Exception {
        long requestId = requestId(sendRequest(bogdan, anna).andExpect(status().isCreated()));

        sendRequest(anna, bogdan).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(requestId))
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        assertThat(socialApi.friendIds(anna)).containsExactly(bogdan);
        assertThat(friendshipCount()).isOne();
        assertThat(events.stream(FriendRequestSent.class))
                .containsExactly(new FriendRequestSent(requestId, bogdan, anna));
    }

    @Test
    void publishesFriendRequestSentWhenARequestIsCreated() throws Exception {
        long requestId = requestId(sendRequest(anna, bogdan));
        sendRequest(anna, bogdan);

        assertThat(events.stream(FriendRequestSent.class))
                .containsExactly(new FriendRequestSent(requestId, anna, bogdan));
    }

    @Test
    void onlyTheAddresseeCanAnswerARequest() throws Exception {
        long requestId = requestId(sendRequest(anna, bogdan));

        accept(anna, requestId).andExpect(status().isForbidden());
        decline(carla, requestId).andExpect(status().isForbidden());
        accept(bogdan, UNKNOWN_USER_ID).andExpect(status().isNotFound());

        accept(bogdan, requestId).andExpect(status().isOk());
        accept(bogdan, requestId).andExpect(status().isConflict());
        decline(bogdan, requestId).andExpect(status().isConflict());
    }

    @Test
    void decliningDeletesTheRequestSoItCanBeSentAgain() throws Exception {
        long requestId = requestId(sendRequest(anna, bogdan));

        decline(bogdan, requestId).andExpect(status().isNoContent());

        assertThat(friendshipCount()).isZero();
        sendRequest(anna, bogdan).andExpect(status().isCreated());
    }

    @Test
    void removesAFriendshipForBothUsers() throws Exception {
        accept(bogdan, requestId(sendRequest(anna, bogdan)));

        removeFriend(bogdan, anna).andExpect(status().isNoContent());

        friends(anna).andExpect(jsonPath("$", hasSize(0)));
        friends(bogdan).andExpect(jsonPath("$", hasSize(0)));
        removeFriend(anna, bogdan).andExpect(status().isNotFound());
    }

    @Test
    void doesNotRemoveAPendingRequestAsAFriendship() throws Exception {
        sendRequest(anna, bogdan);

        removeFriend(anna, bogdan).andExpect(status().isNotFound());
        assertThat(friendshipCount()).isOne();
    }

    @Test
    void searchShowsTheRelationToEachMatchAndExcludesTheCurrentUser() throws Exception {
        Long dan = createUser(NAME_PREFIX + " Dan", null);
        accept(bogdan, requestId(sendRequest(anna, bogdan)));
        sendRequest(anna, carla);
        sendRequest(dan, anna);
        Long eva = createUser(NAME_PREFIX + " Eva", null);

        search(anna, " friendTEST ")
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].id").value(bogdan))
                .andExpect(jsonPath("$[0].relation").value("FRIENDS"))
                .andExpect(jsonPath("$[0].city").value("Iasi"))
                .andExpect(jsonPath("$[1].id").value(carla))
                .andExpect(jsonPath("$[1].relation").value("REQUESTED"))
                .andExpect(jsonPath("$[2].id").value(dan))
                .andExpect(jsonPath("$[2].relation").value("INCOMING"))
                .andExpect(jsonPath("$[3].id").value(eva))
                .andExpect(jsonPath("$[3].relation").value("NONE"));
    }

    @Test
    void reportsTheRelationToASingleUserFromTheCurrentUsersSide() throws Exception {
        relation(anna, bogdan).andExpect(status().isOk()).andExpect(jsonPath("$.relation").value("NONE"));

        long requestId = requestId(sendRequest(anna, bogdan));
        relation(anna, bogdan).andExpect(jsonPath("$.relation").value("REQUESTED"));
        relation(bogdan, anna).andExpect(jsonPath("$.relation").value("INCOMING"));

        accept(bogdan, requestId);
        relation(anna, bogdan).andExpect(jsonPath("$.relation").value("FRIENDS"));
        relation(bogdan, anna).andExpect(jsonPath("$.relation").value("FRIENDS"));

        relation(anna, anna).andExpect(status().isBadRequest());
        relation(anna, UNKNOWN_USER_ID).andExpect(status().isNotFound());
    }

    @Test
    void searchNeedsAtLeastTwoLettersAndTreatsWildcardsLiterally() throws Exception {
        search(anna, "F").andExpect(jsonPath("$", hasSize(0)));
        search(anna, " F ").andExpect(jsonPath("$", hasSize(0)));
        search(anna, "%%").andExpect(jsonPath("$", hasSize(0)));
        search(anna, "__").andExpect(jsonPath("$", hasSize(0)));
        search(anna, "dtest B").andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void searchReturnsAtMostTwentyUsers() throws Exception {
        IntStream.range(0, SEARCH_MAX_RESULTS).forEach(index -> createUser(NAME_PREFIX + " Extra " + index, null));

        search(anna, NAME_PREFIX).andExpect(jsonPath("$", hasSize(SEARCH_MAX_RESULTS)));
    }

    private Long createUser(String displayName, String city) {
        Long id = jdbc.queryForObject("""
                INSERT INTO users (display_name, email, password_hash, city)
                VALUES (?, gen_random_uuid() || '@friends.test', ?, ?)
                RETURNING id
                """, Long.class, displayName, PASSWORD_HASH, city);
        createdUserIds.add(id);
        return id;
    }

    private Integer friendshipCount() {
        return jdbc.queryForObject("SELECT count(*) FROM friendships WHERE requester_id IN (?, ?, ?)",
                Integer.class, anna, bogdan, carla);
    }

    private long requestId(ResultActions result) throws Exception {
        JsonNode body = jsonMapper.readTree(result.andReturn().getResponse().getContentAsString());
        return body.get("id").asLong();
    }

    private ResultActions sendRequest(Long requesterId, Long addresseeId) throws Exception {
        return mockMvc.perform(post("/friends/requests").header(HttpHeaders.AUTHORIZATION, tokens.bearer(requesterId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userId\": " + addresseeId + "}"));
    }

    private ResultActions accept(Long userId, long requestId) throws Exception {
        return mockMvc.perform(post("/friends/requests/{id}/accept", requestId)
                .header(HttpHeaders.AUTHORIZATION, tokens.bearer(userId)));
    }

    private ResultActions decline(Long userId, long requestId) throws Exception {
        return mockMvc.perform(post("/friends/requests/{id}/decline", requestId)
                .header(HttpHeaders.AUTHORIZATION, tokens.bearer(userId)));
    }

    private ResultActions removeFriend(Long userId, Long friendId) throws Exception {
        return mockMvc.perform(delete("/friends/{userId}", friendId)
                .header(HttpHeaders.AUTHORIZATION, tokens.bearer(userId)));
    }

    private ResultActions friends(Long userId) throws Exception {
        return mockMvc.perform(get("/friends").header(HttpHeaders.AUTHORIZATION, tokens.bearer(userId)))
                .andExpect(status().isOk());
    }

    private ResultActions relation(Long userId, Long otherUserId) throws Exception {
        return mockMvc.perform(get("/users/{id}/relation", otherUserId)
                .header(HttpHeaders.AUTHORIZATION, tokens.bearer(userId)));
    }

    private ResultActions search(Long userId, String query) throws Exception {
        return mockMvc.perform(get("/users/search").param("q", query)
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(userId)))
                .andExpect(status().isOk());
    }
}
