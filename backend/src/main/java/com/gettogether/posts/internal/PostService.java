package com.gettogether.posts.internal;

import com.gettogether.events.EventDetails;
import com.gettogether.events.EventsApi;
import com.gettogether.participation.ParticipationApi;
import com.gettogether.posts.PostCreated;
import com.gettogether.shared.BadRequestException;
import com.gettogether.shared.ConflictException;
import com.gettogether.shared.ForbiddenException;
import com.gettogether.shared.NotFoundException;
import com.gettogether.users.UserSummary;
import com.gettogether.users.UsersApi;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
class PostService {

    private static final String EVENT_NOT_ENDED = "EVENT_NOT_ENDED";
    private static final String NOT_GOING = "NOT_GOING";
    private static final String POST_ALREADY_EXISTS = "POST_ALREADY_EXISTS";

    private final PostRepository postRepository;
    private final EventsApi eventsApi;
    private final ParticipationApi participationApi;
    private final UsersApi usersApi;
    private final ApplicationEventPublisher eventPublisher;

    PostService(PostRepository postRepository, EventsApi eventsApi, ParticipationApi participationApi,
            UsersApi usersApi, ApplicationEventPublisher eventPublisher) {
        this.postRepository = postRepository;
        this.eventsApi = eventsApi;
        this.participationApi = participationApi;
        this.usersApi = usersApi;
        this.eventPublisher = eventPublisher;
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

        Post post;
        try {
            post = postRepository.saveAndFlush(new Post(userId, eventId, request.rating(), request.text()));
        } catch (DataIntegrityViolationException exception) {
            // The unique constraint closes the race between the existence check and concurrent inserts.
            throw new ConflictException(POST_ALREADY_EXISTS);
        }
        PostDto createdPost = toDto(post, findAuthor(userId));
        eventPublisher.publishEvent(new PostCreated(post.getId(), eventId, userId));
        return createdPost;
    }

    @Transactional(readOnly = true)
    PostListResponse findByEvent(Long eventId) {
        if (!eventsApi.exists(eventId)) {
            throw new NotFoundException("Event " + eventId + " not found");
        }
        List<Post> posts = postRepository.findByEventIdOrderByCreatedAtDesc(eventId);
        Map<Long, UserSummary> authors = findAuthors(posts);
        List<PostDto> postDtos = posts.stream()
                .map(post -> toDto(post, requireAuthor(authors, post.getUserId())))
                .toList();
        PostRatingSummary summary = postRepository.summarizeRatings(eventId);
        return new PostListResponse(summary.getAverageRating(), summary.getCount(), postDtos);
    }

    private Map<Long, UserSummary> findAuthors(List<Post> posts) {
        List<Long> authorIds = posts.stream().map(Post::getUserId).distinct().toList();
        return usersApi.findByIds(authorIds).stream()
                .collect(Collectors.toMap(UserSummary::id, Function.identity()));
    }

    private UserSummary findAuthor(Long userId) {
        return usersApi.findById(userId)
                .orElseThrow(() -> new NotFoundException("User " + userId + " not found"));
    }

    private UserSummary requireAuthor(Map<Long, UserSummary> authors, Long userId) {
        UserSummary author = authors.get(userId);
        if (author == null) {
            throw new NotFoundException("User " + userId + " not found");
        }
        return author;
    }

    private PostDto toDto(Post post, UserSummary author) {
        return new PostDto(post.getId(), post.getUserId(), post.getEventId(), author.displayName(),
                author.avatarUrl(), post.getRating(), post.getText(), post.getCreatedAt());
    }
}
