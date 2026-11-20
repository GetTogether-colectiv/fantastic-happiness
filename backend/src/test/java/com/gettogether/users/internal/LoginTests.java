package com.gettogether.users.internal;

import com.gettogether.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class LoginTests {

    private static final String DEMO_EMAIL = "alexandra.pop@gettogether.test";
    private static final String DEMO_PASSWORD = "password1";
    private static final String INVALID_CREDENTIALS = "Email or password is incorrect";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JsonMapper jsonMapper;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    @Value("${server.servlet.context-path}")
    private String contextPath;

    @ParameterizedTest
    @ValueSource(strings = {DEMO_EMAIL, "iulia.dragomir@gettogether.test"})
    void signsInSeededAccountsWithNormalizedEmail(String email) throws Exception {
        long userId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        assertSuccessfulLogin(" " + email.toUpperCase(Locale.ROOT) + " ", DEMO_PASSWORD, userId);
    }

    @Test
    @Transactional
    void signsInANewlyRegisteredUserAndEnforcesTheBcryptByteLimit() throws Exception {
        String email = "login.test@gettogether.test";
        String password = " " + "é".repeat(34) + "12 ";
        String registration = mockMvc.perform(post(contextPath + "/auth/register").contextPath(contextPath)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonMapper.writeValueAsString(Map.of(
                                "name", "Login Test", "email", email, "password", password))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long userId = JsonPath.parse(registration).read("$.user.id", Long.class);
        assertSuccessfulLogin(email, password, userId);
        assertInvalidCredentials(email, password + "x");
    }

    @Test
    void returnsIdenticalErrorsForWrongPasswordAndUnknownEmail() throws Exception {
        String wrongPassword = assertInvalidCredentials(DEMO_EMAIL, "wrong");
        String unknownEmail = assertInvalidCredentials("unknown@gettogether.test", DEMO_PASSWORD);

        assertThat(wrongPassword).isEqualTo(unknownEmail);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "invalid-email"})
    void rejectsInvalidEmail(String email) throws Exception {
        login(email, DEMO_PASSWORD)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.email").isNotEmpty());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" "})
    void rejectsBlankOrMissingPassword(String password) throws Exception {
        login(DEMO_EMAIL, password)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").isNotEmpty());
    }

    private void assertSuccessfulLogin(String email, String password, long userId) throws Exception {
        String body = login(email, password)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.displayName").isNotEmpty())
                .andExpect(jsonPath("$.user.password").doesNotHaveJsonPath())
                .andExpect(jsonPath("$.user.passwordHash").doesNotHaveJsonPath())
                .andReturn().getResponse().getContentAsString();

        var response = JsonPath.parse(body);
        assertThat(response.read("$.user.id", Long.class)).isEqualTo(userId);
        assertThat(jwtService.verifyToken(response.read("$.token", String.class))).isEqualTo(userId);
        String hash = jdbc.queryForObject("SELECT password_hash FROM users WHERE id = ?", String.class, userId);
        assertThat(body).doesNotContain(password, hash);
    }

    private String assertInvalidCredentials(String email, String password) throws Exception {
        return login(email, password)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(INVALID_CREDENTIALS))
                .andExpect(jsonPath("$.token").doesNotHaveJsonPath())
                .andReturn().getResponse().getContentAsString();
    }

    private ResultActions login(String email, String password) throws Exception {
        String body = jsonMapper.createObjectNode().put("email", email).put("password", password).toString();
        return mockMvc.perform(post(contextPath + "/auth/login").contextPath(contextPath)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }
}
