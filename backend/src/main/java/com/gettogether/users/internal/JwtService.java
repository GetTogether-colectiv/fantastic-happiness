package com.gettogether.users.internal;

import com.gettogether.users.UserTokenAuthenticator.AuthenticatedUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

@Service
class JwtService {

    private static final Duration TOKEN_LIFETIME = Duration.ofDays(7);

    private final SecretKey signingKey;
    private final JwtParser parser;

    JwtService(@Value("${app.jwt.secret}") String secret) {
        signingKey = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
        parser = Jwts.parser()
                .verifyWith(signingKey)
                .sig().clear().add(Jwts.SIG.HS256).and()
                .build();
    }

    String issueToken(long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(Long.toString(userId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(TOKEN_LIFETIME)))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    AuthenticatedUser verifyToken(String token) {
        Claims claims = parser.parseSignedClaims(token).getPayload();
        Date expiration = claims.getExpiration();
        if (expiration == null) {
            throw new JwtException("Token expiration is required");
        }
        return new AuthenticatedUser(Long.parseLong(claims.getSubject()), expiration.toInstant());
    }
}
