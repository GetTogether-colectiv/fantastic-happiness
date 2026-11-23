package com.gettogether.users.internal;

import com.gettogether.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class RegisterTests {

    private static final String NAME = "New User";
    private static final String EMAIL = "new.user@gettogether.test";
    private static final String PASSWORD = " ValidPass1! ";
    private static final int TIMEOUT_SECONDS = 10;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Value("${server.servlet.context-path}")
    private String contextPath;

    @AfterEach
    void deleteRegisteredUser() {
        jdbc.update("DELETE FROM users WHERE email = ?", EMAIL);
    }

    @Test
    void createsUserWithDefaultsAndReturnsASignedTokenWithoutCredentials() throws Exception {
        String body = register(" " + NAME + " ", " " + EMAIL.toUpperCase(Locale.ROOT) + " ", PASSWORD)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.displayName").value(NAME))
                .andExpect(jsonPath("$.user.city").value(nullValue()))
                .andExpect(jsonPath("$.user.avatarUrl").value(nullValue()))
                .andExpect(jsonPath("$.user.password").doesNotHaveJsonPath())
                .andExpect(jsonPath("$.user.passwordHash").doesNotHaveJsonPath())
                .andReturn().getResponse().getContentAsString();

        Long userId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, EMAIL);
        assertThat(JsonPath.parse(body).read("$.user.id", Long.class)).isEqualTo(userId);
        assertThat(jwtService.verifyToken(JsonPath.parse(body).read("$.token", String.class)).userId()).isEqualTo(userId);

        String hash = jdbc.queryForObject("SELECT password_hash FROM users WHERE id = ?", String.class, userId);
        assertThat(passwordEncoder.matches(PASSWORD, hash)).isTrue();
        assertThat(body).doesNotContain(PASSWORD, hash);
        assertThat(jdbc.queryForObject("""
                SELECT created_at IS NOT NULL AND city IS NULL AND avatar_url IS NULL
                FROM users WHERE id = ?
                """, Boolean.class, userId)).isTrue();
        assertThat(jdbc.queryForList("SELECT category FROM user_preferred_categories WHERE user_id = ?", userId))
                .isEmpty();
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void rejectsInvalidInput(String name, String email, String password, String field) throws Exception {
        register(name, email, password)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors." + field).isNotEmpty());
        assertThat(registeredUserCount()).isZero();
    }

    static Stream<Arguments> invalidRequests() {
        return Stream.of(
                Arguments.of(" ", EMAIL, PASSWORD, "name"),
                Arguments.of("a".repeat(101), EMAIL, PASSWORD, "name"),
                Arguments.of(NAME, "", PASSWORD, "email"),
                Arguments.of(NAME, "invalid-email", PASSWORD, "email"),
                Arguments.of(NAME, EMAIL, "Aa1!😀bc", "password"),
                Arguments.of(NAME, EMAIL, "abcdef1!", "password"),
                Arguments.of(NAME, EMAIL, "ABCDEF1!", "password"),
                Arguments.of(NAME, EMAIL, "Abcdefg!", "password"),
                Arguments.of(NAME, EMAIL, "Abcdef1\u00a0", "password"),
                Arguments.of(NAME, EMAIL, "Àbcdef1!", "password"),
                Arguments.of(NAME, EMAIL, "ABCDÉF1!", "password"),
                Arguments.of(NAME, EMAIL, "Abcdef١!", "password"),
                Arguments.of(NAME, EMAIL, "Abcdef1🫩", "password"));
    }

    @Test
    void allowsUnicodeAlongsideTheRequiredAsciiCharacters() throws Exception {
        register(NAME, EMAIL, "Aa1[é中🫩字").andExpect(status().isCreated());
        assertThat(registeredUserCount()).isOne();
    }

    @Test
    void rejectsPasswordsExceedingTheBcryptByteLimit() throws Exception {
        register(NAME, EMAIL, "é".repeat(34) + "Aa1!x")
                .andExpect(status().isBadRequest());
        assertThat(registeredUserCount()).isZero();
    }

    @Test
    void rejectsAnExistingEmailAndItsCaseVariant() throws Exception {
        String email = jdbc.queryForObject("SELECT email FROM users ORDER BY id LIMIT 1", String.class);
        register(NAME, email, PASSWORD).andExpect(status().isConflict());
        register(NAME, email.toUpperCase(Locale.ROOT), PASSWORD).andExpect(status().isConflict());
    }

    @Test
    void createsOnlyOneUserWhenTwoRequestsRegisterTheSameEmail() throws Exception {
        CyclicBarrier start = new CyclicBarrier(2);
        Callable<Integer> submission = () -> {
            start.await(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            return register(NAME, EMAIL, PASSWORD).andReturn().getResponse().getStatus();
        };

        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(submission);
            var second = executor.submit(submission);
            assertThat(List.of(first.get(TIMEOUT_SECONDS, TimeUnit.SECONDS),
                    second.get(TIMEOUT_SECONDS, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(HttpStatus.CREATED.value(), HttpStatus.CONFLICT.value());
        }

        assertThat(registeredUserCount()).isEqualTo(1);
    }

    private ResultActions register(String name, String email, String password) throws Exception {
        return mockMvc.perform(post(contextPath + "/auth/register").contextPath(contextPath)
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonMapper.writeValueAsString(Map.of("name", name, "email", email, "password", password))));
    }

    private Integer registeredUserCount() {
        return jdbc.queryForObject("SELECT count(*) FROM users WHERE email = ?", Integer.class, EMAIL);
    }
}
