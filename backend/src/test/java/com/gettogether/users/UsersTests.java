package com.gettogether.users;

import com.gettogether.TestJwtTokens;
import com.gettogether.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class UsersTests {

    private static final long UNKNOWN_USER_ID = 999_999L;
    private static final long DEMO_USER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TestJwtTokens tokens;

    @Autowired
    private UsersApi usersApi;

    @Test
    void listsSeedUsers() throws Exception {
        mockMvc.perform(get("/users").header(HttpHeaders.AUTHORIZATION, tokens.bearer(DEMO_USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].displayName").isNotEmpty());
    }

    @Test
    void returnsNotFoundForUnknownUser() throws Exception {
        mockMvc.perform(get("/users/{id}", UNKNOWN_USER_ID)
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(DEMO_USER_ID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void returnsTheTokenUserEvenWhenTheLegacyHeaderNamesAnotherUser() throws Exception {
        mockMvc.perform(get("/users/me").header(HttpHeaders.AUTHORIZATION, tokens.bearer(OTHER_USER_ID))
                        .header("X-User-Id", DEMO_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(OTHER_USER_ID));
    }

    @Test
    void rejectsCurrentUserRequestWithoutBearerToken() throws Exception {
        mockMvc.perform(get("/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void rejectsTokenForUnknownCurrentUser() throws Exception {
        mockMvc.perform(get("/users/me").header(HttpHeaders.AUTHORIZATION, tokens.bearer(UNKNOWN_USER_ID)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void exposesSummariesThroughUsersApi() {
        assertThat(usersApi.findById(DEMO_USER_ID)).isPresent();
        assertThat(usersApi.findById(UNKNOWN_USER_ID)).isEmpty();
        assertThat(usersApi.findByIds(List.of(DEMO_USER_ID, OTHER_USER_ID))).hasSize(2);
    }
}
