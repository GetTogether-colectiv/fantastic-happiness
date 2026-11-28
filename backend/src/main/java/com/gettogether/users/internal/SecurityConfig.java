package com.gettogether.users.internal;

import com.gettogether.shared.ErrorResponse;
import com.gettogether.users.UserTokenAuthenticator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import tools.jackson.databind.json.JsonMapper;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, UserTokenAuthenticator authenticator,
                                           JsonMapper jsonMapper) throws Exception {
        return http
                .cors(withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(new JwtAuthenticationFilter(authenticator), AnonymousAuthenticationFilter.class)
                .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint((request, response, failure) -> {
                    HttpStatus status = HttpStatus.UNAUTHORIZED;
                    response.setStatus(status.value());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    jsonMapper.writeValue(response.getOutputStream(),
                            new ErrorResponse(status.value(), status.getReasonPhrase()));
                }))
                .authorizeHttpRequests(requests -> requests
                        .requestMatchers("/auth/**", "/ws/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/photos/**").permitAll()
                        .anyRequest().authenticated())
                .build();
    }

    @Bean
    BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
