package com.gettogether.posts.internal;

import com.gettogether.shared.NotFoundException;
import com.gettogether.users.UserSummary;
import com.gettogether.users.UsersApi;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
class AuthorLookup {

    private final UsersApi usersApi;

    AuthorLookup(UsersApi usersApi) {
        this.usersApi = usersApi;
    }

    UserSummary find(Long userId) {
        return usersApi.findById(userId).orElseThrow(() -> notFound(userId));
    }

    Function<Long, UserSummary> findAll(Collection<Long> userIds) {
        Map<Long, UserSummary> authors = usersApi.findByIds(userIds.stream().distinct().toList()).stream()
                .collect(Collectors.toMap(UserSummary::id, Function.identity()));
        return userId -> {
            UserSummary author = authors.get(userId);
            if (author == null) {
                throw notFound(userId);
            }
            return author;
        };
    }

    private static NotFoundException notFound(Long userId) {
        return new NotFoundException("User " + userId + " not found");
    }
}
