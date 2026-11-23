package com.gettogether.users.internal;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
class PasswordHashMigrationTests {

    private static final String SEED_EMAIL = "alexandra.pop@gettogether.test";
    private static final String LEGACY_EMAIL = "legacy@example.test";
    private static final Path MIGRATION = Path.of("../database/migrations/019_add_user_password_hash.sql");

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16");

    @Test
    void upgradesLegacyDataAndPreservesPasswordsOnRerun() throws Exception {
        var jdbc = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        jdbc.execute("""
                CREATE TABLE users (
                    id BIGSERIAL PRIMARY KEY,
                    display_name VARCHAR(100) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL
                );
                CREATE TABLE user_preferred_categories (
                    user_id BIGINT REFERENCES users(id),
                    category VARCHAR(30) NOT NULL
                );
                """);
        jdbc.update("INSERT INTO users (display_name, email) VALUES (?, ?), (?, ?)",
                "Seeded user", SEED_EMAIL, "Legacy user", LEGACY_EMAIL);
        jdbc.update("INSERT INTO user_preferred_categories VALUES (2, 'MUSIC')");

        String migration = Files.readString(MIGRATION);
        jdbc.execute(migration);
        var encoder = new BCryptPasswordEncoder();
        String seededHash = passwordHash(jdbc, SEED_EMAIL);
        String legacyHash = passwordHash(jdbc, LEGACY_EMAIL);
        assertThat(encoder.matches("password1", seededHash)).isTrue();
        assertThat(legacyHash).startsWith("$2a$10$");
        assertThat(encoder.matches("password1", legacyHash)).isFalse();
        assertThat(jdbc.queryForObject("SELECT display_name FROM users WHERE id = 2", String.class))
                .isEqualTo("Legacy user");
        assertThat(jdbc.queryForObject("SELECT category FROM user_preferred_categories WHERE user_id = 2", String.class))
                .isEqualTo("MUSIC");
        assertThatThrownBy(() -> jdbc.update("INSERT INTO users (display_name, email) VALUES (?, ?)",
                "Missing password", "missing@example.test"))
                .hasMessageContaining("password_hash");

        String existingHash = encoder.encode("AlreadyMigrated1!");
        jdbc.update("UPDATE users SET password_hash = ? WHERE email = ?", existingHash, SEED_EMAIL);
        jdbc.execute(migration);
        assertThat(passwordHash(jdbc, SEED_EMAIL)).isEqualTo(existingHash);
        assertThat(passwordHash(jdbc, LEGACY_EMAIL)).isEqualTo(legacyHash);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(2);
    }

    private static String passwordHash(JdbcTemplate jdbc, String email) {
        return jdbc.queryForObject("SELECT password_hash FROM users WHERE email = ?", String.class, email);
    }
}
