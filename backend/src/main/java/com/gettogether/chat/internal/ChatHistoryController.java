package com.gettogether.chat.internal;

import com.gettogether.users.CurrentUserProvider;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/events/{id}/messages")
class ChatHistoryController {

    private static final String DEFAULT_PAGE_SIZE = "30";
    private static final int MIN_PAGE_SIZE = 1;
    private static final int MAX_PAGE_SIZE = 100;

    private final ChatService chatService;
    private final CurrentUserProvider currentUserProvider;

    ChatHistoryController(ChatService chatService, CurrentUserProvider currentUserProvider) {
        this.chatService = chatService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    List<ChatMessageDto> findHistory(@PathVariable Long id,
                                     @RequestParam(required = false) Instant before,
                                     @RequestParam(defaultValue = DEFAULT_PAGE_SIZE)
                                     @Min(MIN_PAGE_SIZE) @Max(MAX_PAGE_SIZE) int size) {
        return chatService.findHistory(id, currentUserProvider.currentUserId(), before, size);
    }
}
