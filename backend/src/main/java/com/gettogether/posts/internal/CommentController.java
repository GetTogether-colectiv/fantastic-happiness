package com.gettogether.posts.internal;

import com.gettogether.users.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
class CommentController {

    private final CommentService commentService;
    private final CurrentUserProvider currentUserProvider;

    CommentController(CommentService commentService, CurrentUserProvider currentUserProvider) {
        this.commentService = commentService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/posts/{postId}/comments")
    @Operation(summary = "List the comments on a post, oldest first")
    List<CommentDto> findByPost(@PathVariable Long postId) {
        return commentService.findByPost(postId);
    }

    @PostMapping("/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Comment on a post")
    CommentDto create(@PathVariable Long postId, @Valid @RequestBody CreateCommentRequest request) {
        return commentService.create(currentUserProvider.currentUserId(), postId, request);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete one of your own comments")
    void delete(@PathVariable Long commentId) {
        commentService.delete(currentUserProvider.currentUserId(), commentId);
    }
}
