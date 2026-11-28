package com.gettogether.posts.internal;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping(PhotoController.PHOTOS_PATH)
class PhotoController {

    static final String PHOTOS_PATH = "/photos";
    // A file name never changes content (each upload gets a new UUID), so browsers can keep it for a day.
    private static final CacheControl PHOTO_CACHE = CacheControl.maxAge(Duration.ofDays(1));

    private final PhotoStorage photoStorage;

    PhotoController(PhotoStorage photoStorage) {
        this.photoStorage = photoStorage;
    }

    @GetMapping("/{fileName}")
    @Operation(summary = "Get an uploaded post photo")
    ResponseEntity<Resource> getPhoto(@PathVariable String fileName) {
        Resource photo = photoStorage.load(fileName);
        MediaType contentType = MediaTypeFactory.getMediaType(photo).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(contentType)
                .cacheControl(PHOTO_CACHE)
                .body(photo);
    }
}
