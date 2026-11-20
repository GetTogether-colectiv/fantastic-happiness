package com.gettogether.shared;

import com.gettogether.TestJwtTokens;
import com.gettogether.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.server.support.WebSocketHttpRequestHandler;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.handler;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SecurityConfigTests {

    private static final String USERS_PATH = "/users";
    private static final String PROFILE_PATH = USERS_PATH + "/me";
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final long DEMO_USER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;
    private static final long UNKNOWN_USER_ID = 999_999L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TestJwtTokens tokens;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Value("${server.servlet.context-path}")
    private String contextPath;

    @Value("${gettogether.cors.allowed-origins}")
    private String allowedOrigin;

    @Test
    void rejectsUnauthenticatedRequestsEvenWithAUserIdHeader() throws Exception {
        mockMvc.perform(get(contextPath + USERS_PATH).contextPath(contextPath)
                        .header(HttpHeaders.ORIGIN, allowedOrigin))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, allowedOrigin))
                .andExpect(result -> assertThat(result.getRequest().getSession(false)).isNull());

        mockMvc.perform(get(contextPath + PROFILE_PATH).contextPath(contextPath)
                        .header(USER_ID_HEADER, DEMO_USER_ID))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsMalformedExpiredAndInvalidBearerTokens() throws Exception {
        for (String authorization : List.of(
                "Basic invalid",
                "Bearer",
                "Bearer invalid",
                tokens.expiredBearer(DEMO_USER_ID),
                tokens.wrongSignatureBearer(DEMO_USER_ID),
                tokens.invalidSubjectBearer(),
                tokens.bearer(UNKNOWN_USER_ID))) {
            mockMvc.perform(get(contextPath + PROFILE_PATH).contextPath(contextPath)
                            .header(HttpHeaders.AUTHORIZATION, authorization)
                            .header(USER_ID_HEADER, DEMO_USER_ID))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }
    }

    @Test
    void listsOnlyTheTokenUsersEventsDespiteTheLegacyHeader() throws Exception {
        String myEvents = contextPath + "/me/events";
        String masterclass = "$[?(@.title == 'Pastry Masterclass')]";

        mockMvc.perform(get(myEvents).contextPath(contextPath).param("when", "UPCOMING")
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(DEMO_USER_ID))
                        .header(USER_ID_HEADER, OTHER_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath(masterclass).isEmpty());

        mockMvc.perform(get(myEvents).contextPath(contextPath).param("when", "UPCOMING")
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(OTHER_USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath(masterclass).isNotEmpty());
    }

    @Test
    void allowsAuthRequestsToReachRouting() throws Exception {
        mockMvc.perform(post(contextPath + "/auth/unmapped").contextPath(contextPath))
                .andExpect(status().isNotFound());
    }

    @Test
    void allowsAnonymousRequestsToReachTheWebSocketHandshakeHandler() throws Exception {
        mockMvc.perform(get(contextPath + "/ws").contextPath(contextPath)
                        .header(HttpHeaders.ORIGIN, allowedOrigin))
                .andExpect(handler().handlerType(WebSocketHttpRequestHandler.class))
                .andExpect(status().isBadRequest());
    }

    @Test
    void disablesDefaultLoginAndLogout() throws Exception {
        mockMvc.perform(get(contextPath + "/login").contextPath(contextPath))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post(contextPath + "/logout").contextPath(contextPath))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void acceptsPreflightFromTheConfiguredOriginAndRejectsOtherOrigins() throws Exception {
        mockMvc.perform(profilePreflight(allowedOrigin))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, allowedOrigin));

        mockMvc.perform(profilePreflight("https://other.example"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    @Transactional
    void acceptsAnAuthenticatedWriteWithoutCsrfOrSession() throws Exception {
        mockMvc.perform(put(contextPath + PROFILE_PATH).contextPath(contextPath)
                        .header(HttpHeaders.AUTHORIZATION, tokens.bearer(DEMO_USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\": \"Demo User\"}"))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getRequest().getSession(false)).isNull());
    }

    @Test
    void encoderMatchesTheSeededPassword() {
        String hash = jdbc.queryForObject("SELECT password_hash FROM users WHERE id = ?", String.class, DEMO_USER_ID);
        assertThat(passwordEncoder.matches("password1", hash)).isTrue();
    }

    private MockHttpServletRequestBuilder profilePreflight(String origin) {
        return options(contextPath + PROFILE_PATH).contextPath(contextPath)
                .header(HttpHeaders.ORIGIN, origin)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.PUT.name())
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, HttpHeaders.AUTHORIZATION);
    }
}
