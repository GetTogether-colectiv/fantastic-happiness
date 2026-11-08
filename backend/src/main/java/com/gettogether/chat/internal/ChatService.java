package com.gettogether.chat.internal;

import com.gettogether.participation.ParticipationApi;
import com.gettogether.shared.ForbiddenException;
import com.gettogether.shared.NotFoundException;
import com.gettogether.users.UserSummary;
import com.gettogether.users.UsersApi;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
class ChatService {

    private static final String NOT_GOING = "NOT_GOING";
    private static final int FIRST_PAGE = 0;

    private final ChatMessageRepository chatMessageRepository;
    private final ParticipationApi participationApi;
    private final UsersApi usersApi;

    ChatService(ChatMessageRepository chatMessageRepository, ParticipationApi participationApi, UsersApi usersApi) {
        this.chatMessageRepository = chatMessageRepository;
        this.participationApi = participationApi;
        this.usersApi = usersApi;
    }

    ChatMessageDto save(Long eventId, Long userId, String content) {
        requireGoing(userId, eventId);
        UserSummary author = usersApi.findById(userId)
                .orElseThrow(() -> new NotFoundException("User " + userId + " not found"));
        ChatMessage message = chatMessageRepository.save(new ChatMessage(eventId, userId, content));
        return toDto(message, author);
    }

    @Transactional(readOnly = true)
    List<ChatMessageDto> findHistory(Long eventId, Long userId, Instant before, int size) {
        requireGoing(userId, eventId);
        Pageable page = PageRequest.of(FIRST_PAGE, size);
        List<ChatMessage> messages = before == null
                ? chatMessageRepository.findByEventIdOrderBySentAtDesc(eventId, page)
                : chatMessageRepository.findByEventIdAndSentAtBeforeOrderBySentAtDesc(eventId, before, page);
        Map<Long, UserSummary> authors = findAuthors(messages);
        return messages.stream()
                .map(message -> toDto(message, authors.get(message.getUserId())))
                .toList();
    }

    @Transactional(readOnly = true)
    long countMessages(Long eventId, Long userId) {
        requireGoing(userId, eventId);
        return chatMessageRepository.countByEventId(eventId);
    }

    private void requireGoing(Long userId, Long eventId) {
        if (!participationApi.isGoing(userId, eventId)) {
            throw new ForbiddenException(NOT_GOING);
        }
    }

    private Map<Long, UserSummary> findAuthors(List<ChatMessage> messages) {
        List<Long> authorIds = messages.stream().map(ChatMessage::getUserId).distinct().toList();
        return usersApi.findByIds(authorIds).stream()
                .collect(Collectors.toMap(UserSummary::id, Function.identity()));
    }

    private ChatMessageDto toDto(ChatMessage message, UserSummary author) {
        return new ChatMessageDto(message.getId(), message.getEventId(), message.getUserId(), author.displayName(),
                author.avatarUrl(), message.getContent(), message.getSentAt());
    }
}