package com.gettogether;

import io.jsonwebtoken.Jwts;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

public final class TestJwtTokens {

    private static final Duration TOKEN_LIFETIME = Duration.ofMinutes(10);

    private final SecretKey key = Jwts.SIG.HS256.key().build();

    String encodedSecret() {
        return Base64.getEncoder().encodeToString(key.getEncoded());
    }

    public String bearer(long userId) {
        return bearer(userId, Instant.now().plus(TOKEN_LIFETIME));
    }

    public String bearer(long userId, Instant expiration) {
        return bearer(Long.toString(userId), expiration, key);
    }

    public String expiredBearer(long userId) {
        return bearer(Long.toString(userId), Instant.now().minusSeconds(60), key);
    }

    public String wrongSignatureBearer(long userId) {
        return bearer(Long.toString(userId), Instant.now().plus(TOKEN_LIFETIME), Jwts.SIG.HS256.key().build());
    }

    public String invalidSubjectBearer() {
        return bearer("not-a-user-id", Instant.now().plus(TOKEN_LIFETIME), key);
    }

    private String bearer(String subject, Instant expiration, SecretKey signingKey) {
        return "Bearer " + Jwts.builder()
                .subject(subject)
                .expiration(Date.from(expiration))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }
}
