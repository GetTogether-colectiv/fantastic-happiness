package com.gettogether.users.internal;

import com.gettogether.shared.NotFoundException;
import com.gettogether.users.CurrentUserProvider;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/users")
class UserController {

    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    UserController(UserRepository userRepository, CurrentUserProvider currentUserProvider) {
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    List<UserResponse> findAll() {
        return userRepository.findAll().stream().map(UserResponse::from).toList();
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    UserProfileDto findCurrent() {
        return UserProfileDto.from(currentUser());
    }

    @GetMapping("/{id}")
    UserResponse findById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(UserResponse::from)
                .orElseThrow(() -> new NotFoundException("User " + id + " not found"));
    }

    @PutMapping("/me")
    @Transactional
    UserProfileDto updateCurrent(@Valid @RequestBody UpdateProfileRequest request) {
        User user = currentUser();
        String city = request.city() == null || request.city().isBlank() ? null : request.city().trim();
        user.updateProfile(request.displayName().trim(), city, request.avatarUrl());
        return UserProfileDto.from(user);
    }

    @PutMapping("/me/preferences")
    @Transactional
    UserProfileDto updatePreferences(@Valid @RequestBody UpdatePreferencesRequest request) {
        User user = currentUser();
        user.replacePreferredCategories(request.categories());
        return UserProfileDto.from(user);
    }

    private User currentUser() {
        Long id = currentUserProvider.currentUserId();
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User " + id + " not found"));
    }
}
