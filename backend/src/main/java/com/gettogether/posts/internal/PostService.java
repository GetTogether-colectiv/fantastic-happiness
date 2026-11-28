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
    private final AuthorLookup authorLookup;
    private final CommentRepository commentRepository;
    private final PostPhotoService postPhotoService;
    private final ApplicationEventPublisher eventPublisher;

    PostService(PostRepository postRepository, EventsApi eventsApi, ParticipationApi participationApi,
            AuthorLookup authorLookup, CommentRepository commentRepository, PostPhotoService postPhotoService,
            ApplicationEventPublisher eventPublisher) {
        this.postRepository = postRepository;
        this.eventsApi = eventsApi;
        this.participationApi = participationApi;
        this.authorLookup = authorLookup;
        this.commentRepository = commentRepository;
        this.postPhotoService = postPhotoService;
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
        // A new post has no photos or comments yet; photos are uploaded right after it is created.
        PostDto createdPost = toDto(post, authorLookup.find(userId), List.of(), 0);
        eventPublisher.publishEvent(new PostCreated(post.getId(), eventId, userId));
        return createdPost;
    }

    @Transactional(readOnly = true)
    PostListResponse findByEvent(Long eventId) {
        if (!eventsApi.exists(eventId)) {
            throw new NotFoundException("Event " + eventId + " not found");
        }
        List<Post> posts = postRepository.findByEventIdOrderByCreatedAtDesc(eventId);
        Function<Long, UserSummary> authors = authorLookup.findAll(posts.stream().map(Post::getUserId).toList());
        Map<Long, List<String>> photoUrls = postPhotoService.findPhotoUrls(posts.stream().map(Post::getId).toList());
        Map<Long, Long> commentCounts = countComments(posts);
        List<PostDto> postDtos = posts.stream()
                .map(post -> toDto(post, authors.apply(post.getUserId()),
                        photoUrls.getOrDefault(post.getId(), List.of()),
                        commentCounts.getOrDefault(post.getId(), 0L)))
                .toList();
        PostRatingSummary summary = postRepository.summarizeRatings(eventId);
        return new PostListResponse(summary.getAverageRating(), summary.getCount(), postDtos);
    }

    private Map<Long, Long> countComments(List<Post> posts) {
        if (posts.isEmpty()) {
            return Map.of();
        }
        return commentRepository.countByPostIds(posts.stream().map(Post::getId).toList()).stream()
                .collect(Collectors.toMap(CommentCount::getPostId, CommentCount::getCount));
    }

    private PostDto toDto(Post post, UserSummary author, List<String> photoUrls, long commentCount) {
        return new PostDto(post.getId(), post.getUserId(), post.getEventId(), author.displayName(),
                author.avatarUrl(), post.getRating(), post.getText(), post.getCreatedAt(), photoUrls, commentCount);
    }
}
