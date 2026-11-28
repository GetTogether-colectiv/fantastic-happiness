package com.gettogether.posts.internal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record CreateCommentRequest(
        @NotBlank(message = "Comment is required")
        @Size(max = 500, message = "Comment must not exceed 500 characters")
        String text) {

    CreateCommentRequest {
        if (text != null) {
            text = text.strip();
        }
    }
}
