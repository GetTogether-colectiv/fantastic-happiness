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

@Service
public class UsersApi {

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

    private static UserSummary toSummary(User user) {
        return new UserSummary(user.getId(), user.getDisplayName(), user.getAvatarUrl());
    }

    @Transactional(readOnly = true)
    public Set<EventCategory> preferredCategories(Long userId) {
        return userRepository.findById(userId)
                .map(User::getPreferredCategories)
                .orElse(Set.of());
    }
}
