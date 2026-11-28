package com.gettogether.posts.internal;

import com.gettogether.shared.BadRequestException;
import com.gettogether.shared.ConflictException;
import com.gettogether.shared.ForbiddenException;
import com.gettogether.shared.NotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Service
@Transactional
class PostPhotoService {

    private static final int MAX_PHOTOS_PER_POST = 3;
    // Allowed types and the extension each one is saved with.
    private static final Map<String, String> EXTENSIONS_BY_CONTENT_TYPE = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png");
    private static final String NOT_POST_AUTHOR = "NOT_POST_AUTHOR";
    private static final String TOO_MANY_PHOTOS_MESSAGE = "A post can have at most " + MAX_PHOTOS_PER_POST + " photos";
    private static final String CONCURRENT_UPLOAD_MESSAGE = "Photos were added at the same time, please try again";

    private final PostRepository postRepository;
    private final PostPhotoRepository postPhotoRepository;
    private final PhotoStorage photoStorage;
    private final DataSize maxFileSize;
    private final String invalidPhotoMessage;

    PostPhotoService(PostRepository postRepository, PostPhotoRepository postPhotoRepository,
            PhotoStorage photoStorage,
            @Value("${spring.servlet.multipart.max-file-size}") DataSize maxFileSize) {
        this.postRepository = postRepository;
        this.postPhotoRepository = postPhotoRepository;
        this.photoStorage = photoStorage;
        this.maxFileSize = maxFileSize;
        this.invalidPhotoMessage = "Only JPG or PNG up to " + maxFileSize.toMegabytes() + " MB";
    }

    void addPhotos(Long userId, Long postId, List<MultipartFile> files) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post " + postId + " not found"));
        if (!post.getUserId().equals(userId)) {
            throw new ForbiddenException(NOT_POST_AUTHOR);
        }
        long existingCount = postPhotoRepository.countByPostId(postId);
        if (existingCount + files.size() > MAX_PHOTOS_PER_POST) {
            throw new BadRequestException(TOO_MANY_PHOTOS_MESSAGE);
        }
        // Validate every file before saving any, so one bad file does not leave the others half uploaded.
        files.forEach(this::validate);

        int position = (int) existingCount;
        for (MultipartFile file : files) {
            String fileName = photoStorage.store(file, EXTENSIONS_BY_CONTENT_TYPE.get(file.getContentType()));
            try {
                postPhotoRepository.saveAndFlush(new PostPhoto(postId, fileName, position++));
            } catch (DataIntegrityViolationException exception) {
                // UNIQUE (post_id, position) stops two parallel uploads from going past the limit.
                throw new ConflictException(CONCURRENT_UPLOAD_MESSAGE);
            }
        }
    }

    private void validate(MultipartFile file) {
        boolean allowedType = EXTENSIONS_BY_CONTENT_TYPE.containsKey(file.getContentType());
        if (file.isEmpty() || !allowedType || file.getSize() > maxFileSize.toBytes()) {
            throw new BadRequestException(invalidPhotoMessage);
        }
    }
}
