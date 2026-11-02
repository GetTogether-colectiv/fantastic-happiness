package com.gettogether.users;

import com.gettogether.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
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
    private static final String USER_ID_HEADER = "X-User-Id";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsersApi usersApi;

    @Test
    void listsSeedUsers() throws Exception {
        mockMvc.perform(get("/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].displayName").isNotEmpty());
    }

    @Test
    void returnsNotFoundForUnknownUser() throws Exception {
        mockMvc.perform(get("/users/{id}", UNKNOWN_USER_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void returnsTheCurrentUserFromTheHeader() throws Exception {
        mockMvc.perform(get("/users/me").header(USER_ID_HEADER, 2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2));
    }

    @Test
    void rejectsCurrentUserRequestWithoutHeader() throws Exception {
        mockMvc.perform(get("/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void returnsNotFoundForUnknownCurrentUser() throws Exception {
        mockMvc.perform(get("/users/me").header(USER_ID_HEADER, UNKNOWN_USER_ID))
                .andExpect(status().isNotFound());
    }

    @Test
    void exposesSummariesThroughUsersApi() {
        assertThat(usersApi.findById(1L)).isPresent();
        assertThat(usersApi.findById(UNKNOWN_USER_ID)).isEmpty();
        assertThat(usersApi.findByIds(List.of(1L, 2L))).hasSize(2);
    }
}
