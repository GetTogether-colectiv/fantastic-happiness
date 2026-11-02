package com.gettogether.users.internal;

import com.gettogether.shared.NotFoundException;
import com.gettogether.users.CurrentUserProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    UserResponse findCurrent() {
        return findById(currentUserProvider.currentUserId());
    }

    @GetMapping("/{id}")
    UserResponse findById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(UserResponse::from)
                .orElseThrow(() -> new NotFoundException("User " + id + " not found"));
    }
}
