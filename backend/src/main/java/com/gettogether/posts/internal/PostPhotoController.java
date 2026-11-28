package com.gettogether.posts.internal;

import com.gettogether.users.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/posts/{postId}/photos")
class PostPhotoController {

    private final PostPhotoService postPhotoService;
    private final CurrentUserProvider currentUserProvider;

    PostPhotoController(PostPhotoService postPhotoService, CurrentUserProvider currentUserProvider) {
        this.postPhotoService = postPhotoService;
        this.currentUserProvider = currentUserProvider;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Add up to 3 JPG or PNG photos to your own post")
    List<String> addPhotos(@PathVariable Long postId, @RequestPart("files") List<MultipartFile> files) {
        return postPhotoService.addPhotos(currentUserProvider.currentUserId(), postId, files);
    }
}
