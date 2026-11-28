package com.gettogether.posts.internal;

import com.gettogether.shared.ForbiddenException;
import com.gettogether.shared.NotFoundException;
import com.gettogether.users.UserSummary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.function.Function;

@Service
@Transactional
class CommentService {

    private static final String NOT_COMMENT_AUTHOR = "NOT_COMMENT_AUTHOR";

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final AuthorLookup authorLookup;

    CommentService(CommentRepository commentRepository, PostRepository postRepository,
            AuthorLookup authorLookup) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.authorLookup = authorLookup;
    }

    @Transactional(readOnly = true)
    List<CommentDto> findByPost(Long postId) {
        requirePost(postId);
        List<Comment> comments = commentRepository.findByPostIdOrderByCreatedAtAscIdAsc(postId);
        Function<Long, UserSummary> authors = authorLookup.findAll(
                comments.stream().map(Comment::getUserId).toList());
        return comments.stream()
                .map(comment -> toDto(comment, authors.apply(comment.getUserId())))
                .toList();
    }

    CommentDto create(Long userId, Long postId, CreateCommentRequest request) {
        requirePost(postId);
        Comment comment = commentRepository.save(new Comment(postId, userId, request.text()));
        return toDto(comment, authorLookup.find(userId));
    }

    void delete(Long userId, Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment " + commentId + " not found"));
        if (!comment.getUserId().equals(userId)) {
            throw new ForbiddenException(NOT_COMMENT_AUTHOR);
        }
        commentRepository.delete(comment);
    }

    private void requirePost(Long postId) {
        if (!postRepository.existsById(postId)) {
            throw new NotFoundException("Post " + postId + " not found");
        }
    }

    private CommentDto toDto(Comment comment, UserSummary author) {
        return new CommentDto(comment.getId(), comment.getPostId(), comment.getUserId(), author.displayName(),
                author.avatarUrl(), comment.getText(), comment.getCreatedAt());
    }
}
