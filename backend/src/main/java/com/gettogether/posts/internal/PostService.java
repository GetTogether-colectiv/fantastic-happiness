package com.gettogether.posts.internal;

import com.gettogether.events.EventDetails;
import com.gettogether.events.EventsApi;
import com.gettogether.participation.ParticipationApi;
import com.gettogether.shared.BadRequestException;
import com.gettogether.shared.ConflictException;
import com.gettogether.shared.ForbiddenException;
import com.gettogether.shared.NotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@Transactional
class PostService {

    private static final String EVENT_NOT_ENDED = "EVENT_NOT_ENDED";
    private static final String NOT_GOING = "NOT_GOING";
    private static final String POST_ALREADY_EXISTS = "POST_ALREADY_EXISTS";

    private final PostRepository postRepository;
    private final EventsApi eventsApi;
    private final ParticipationApi participationApi;

    PostService(PostRepository postRepository, EventsApi eventsApi, ParticipationApi participationApi) {
        this.postRepository = postRepository;
        this.eventsApi = eventsApi;
        this.participationApi = participationApi;
    }

    PostDto create(Long userId, Long eventId, CreatePostRequest request) {
        EventDetails event = eventsApi.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Event " + eventId + " not found"));
        if (!event.endsAt().isBefore(Instant.now())) {
            throw new BadRequestException(EVENT_NOT_ENDED);
        }
        if (!participationApi.isGoing(userId, eventId)) {
            throw new ForbiddenException(NOT_GOING);
        }
        if (postRepository.existsByUserIdAndEventId(userId, eventId)) {
            throw new ConflictException(POST_ALREADY_EXISTS);
        }

        try {
            return toDto(postRepository.saveAndFlush(new Post(userId, eventId, request.rating(), request.text())));
        } catch (DataIntegrityViolationException exception) {
            // The unique constraint closes the race between the existence check and concurrent inserts.
            throw new ConflictException(POST_ALREADY_EXISTS);
        }
    }

    private PostDto toDto(Post post) {
        return new PostDto(post.getId(), post.getUserId(), post.getEventId(), post.getRating(), post.getText(),
                post.getCreatedAt());
    }
}
