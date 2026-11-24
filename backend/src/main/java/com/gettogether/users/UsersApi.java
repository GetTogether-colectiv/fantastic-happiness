package com.gettogether.users;

import com.gettogether.shared.EventCategory;
import com.gettogether.users.internal.User;
import com.gettogether.users.internal.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class UsersApi {

    private static final Pattern LIKE_WILDCARD = Pattern.compile("[\\%_]");

    private final UserRepository userRepository;

    UsersApi(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<UserSummary> findById(Long id) {
        return userRepository.findById(id).map(UsersApi::toSummary);
    }

    public List<UserSummary> findByIds(Collection<Long> ids) {
        return userRepository.findAllById(ids).stream().map(UsersApi::toSummary).toList();
    }

    public boolean exists(Long id) {
        return userRepository.existsById(id);
    }

    public List<UserSummary> searchByName(String text, Long excludedUserId, int limit) {
        String pattern = LIKE_WILDCARD.matcher(text).replaceAll(match -> Matcher.quoteReplacement("\\" + match.group()));
        return userRepository.searchByDisplayName(pattern, excludedUserId, limit).stream()
                .map(UsersApi::toSummary)
                .toList();
    }

    private static UserSummary toSummary(User user) {
        return new UserSummary(user.getId(), user.getDisplayName(), user.getAvatarUrl(), user.getCity());
    }

    @Transactional(readOnly = true)
    public Set<EventCategory> preferredCategories(Long userId) {
        return userRepository.findById(userId)
                .map(User::getPreferredCategories)
                .orElse(Set.of());
    }
}
