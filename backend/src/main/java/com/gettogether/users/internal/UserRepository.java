package com.gettogether.users.internal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmailIgnoreCase(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    @Query(value = """
            SELECT * FROM users
            WHERE display_name ILIKE '%' || :pattern || '%' ESCAPE '\'
              AND id <> :excludedUserId
            ORDER BY display_name, id
            LIMIT :limit
            """, nativeQuery = true)
    List<User> searchByDisplayName(String pattern, Long excludedUserId, int limit);
}
