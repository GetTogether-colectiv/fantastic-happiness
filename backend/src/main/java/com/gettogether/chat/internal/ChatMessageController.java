package com.gettogether.chat.internal;

import com.gettogether.shared.ErrorResponse;
import com.gettogether.shared.ForbiddenException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
class ChatMessageController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    ChatMessageController(ChatService chatService, SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping(ChatDestinations.CHAT_PATH)
    void send(@DestinationVariable Long eventId, @Valid @Payload SendChatMessageRequest request, Principal principal) {
        ChatMessageDto message = chatService.save(eventId, Long.valueOf(principal.getName()), request.content());
        messagingTemplate.convertAndSend(ChatDestinations.eventTopic(eventId), message);
    }

    @MessageExceptionHandler(ForbiddenException.class)
    @SendToUser(destinations = ChatDestinations.ERROR_QUEUE, broadcast = false)
    ErrorResponse handleForbidden(ForbiddenException exception) {
        return new ErrorResponse(HttpStatus.FORBIDDEN.value(), exception.getMessage());
    }
}
