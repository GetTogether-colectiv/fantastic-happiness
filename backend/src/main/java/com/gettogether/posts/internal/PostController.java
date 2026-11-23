package com.gettogether.posts.internal;

import com.gettogether.users.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/events/{eventId}/posts")
class PostController {

    private final PostService postService;
    private final CurrentUserProvider currentUserProvider;

    PostController(PostService postService, CurrentUserProvider currentUserProvider) {
        this.postService = postService;
        this.currentUserProvider = currentUserProvider;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Write a post about an attended event that has ended")
    PostDto create(@PathVariable Long eventId, @Valid @RequestBody CreatePostRequest request) {
        return postService.create(currentUserProvider.currentUserId(), eventId, request);
    }
}
