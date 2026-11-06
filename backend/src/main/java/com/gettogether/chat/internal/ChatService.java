package com.gettogether.chat.internal;

import com.gettogether.participation.ParticipationApi;
import com.gettogether.shared.ForbiddenException;
import com.gettogether.shared.NotFoundException;
import com.gettogether.users.UserSummary;
import com.gettogether.users.UsersApi;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
class ChatService {

    private static final String NOT_GOING = "NOT_GOING";

    private final ChatMessageRepository chatMessageRepository;
    private final ParticipationApi participationApi;
    private final UsersApi usersApi;

    ChatService(ChatMessageRepository chatMessageRepository, ParticipationApi participationApi, UsersApi usersApi) {
        this.chatMessageRepository = chatMessageRepository;
        this.participationApi = participationApi;
        this.usersApi = usersApi;
    }

    ChatMessageDto save(Long eventId, Long userId, String content) {
        if (!participationApi.isGoing(userId, eventId)) {
            throw new ForbiddenException(NOT_GOING);
        }
        UserSummary author = usersApi.findById(userId)
                .orElseThrow(() -> new NotFoundException("User " + userId + " not found"));
        ChatMessage message = chatMessageRepository.save(new ChatMessage(eventId, userId, content));
        return new ChatMessageDto(message.getId(), eventId, userId, author.displayName(),
                author.avatarUrl(), content, message.getSentAt());
    }
}