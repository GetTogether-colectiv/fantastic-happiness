package com.gettogether.users.internal;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.SignatureException;
import io.jsonwebtoken.security.WeakKeyException;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTests {

    private static final long USER_ID = 42L;

    private final SecretKey signingKey = Jwts.SIG.HS256.key().build();
    private final JwtService jwtService = new JwtService(encodeSecret(signingKey));

    @Test
    void signsWithHs256AndSetsTheUserIdAndSevenDayLifetime() {
        String token = jwtService.issueToken(USER_ID);
        var parsed = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token);

        assertThat(parsed.getHeader().getAlgorithm()).isEqualTo(Jwts.SIG.HS256.getId());
        assertThat(parsed.getPayload().getSubject()).isEqualTo(Long.toString(USER_ID));
        assertThat(Duration.between(parsed.getPayload().getIssuedAt().toInstant(),
                parsed.getPayload().getExpiration().toInstant())).isEqualTo(Duration.ofDays(7));
        assertThat(jwtService.verifyToken(token).userId()).isEqualTo(USER_ID);
    }

    @Test
    void rejectsATokenSignedWithAnotherKey() {
        JwtService otherIssuer = new JwtService(encodeSecret(Jwts.SIG.HS256.key().build()));
        assertThatThrownBy(() -> jwtService.verifyToken(otherIssuer.issueToken(USER_ID)))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    void rejectsExpiredTokens() {
        String token = Jwts.builder()
                .subject(Long.toString(USER_ID))
                .expiration(Date.from(Instant.now().minusSeconds(60)))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();

        assertThatThrownBy(() -> jwtService.verifyToken(token)).isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void rejectsTokensWithoutAnExpiration() {
        String token = Jwts.builder()
                .subject(Long.toString(USER_ID))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();

        assertThatThrownBy(() -> jwtService.verifyToken(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsTokensUsingADifferentAlgorithmEvenWithTheSameKey() {
        SecretKey longerKey = Jwts.SIG.HS512.key().build();
        JwtService service = new JwtService(encodeSecret(longerKey));
        String token = Jwts.builder()
                .subject(Long.toString(USER_ID))
                .expiration(Date.from(Instant.now().plusSeconds(60)))
                .signWith(longerKey, Jwts.SIG.HS512)
                .compact();

        assertThat(service.verifyToken(service.issueToken(USER_ID)).userId()).isEqualTo(USER_ID);
        assertThatThrownBy(() -> service.verifyToken(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsShortSecrets() {
        String shortSecret = Base64.getEncoder().encodeToString(new byte[16]);
        assertThatThrownBy(() -> new JwtService(shortSecret)).isInstanceOf(WeakKeyException.class);
    }

    private static String encodeSecret(SecretKey key) {
        return Base64.getEncoder().encodeToString(key.getEncoded());
    }
}
