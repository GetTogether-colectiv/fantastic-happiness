package com.gettogether.chat.internal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record SendChatMessageRequest(@NotBlank @Size(max = MAX_CONTENT_LENGTH) String content) {

    static final int MAX_CONTENT_LENGTH = 1000;
}