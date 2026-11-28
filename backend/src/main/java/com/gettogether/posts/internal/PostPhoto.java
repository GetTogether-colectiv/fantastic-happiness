package com.gettogether.posts.internal;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "post_photos")
class PostPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long postId;
    private String fileName;
    private Short position;

    protected PostPhoto() {
    }

    PostPhoto(Long postId, String fileName, int position) {
        this.postId = postId;
        this.fileName = fileName;
        this.position = (short) position;
    }

    Long getPostId() {
        return postId;
    }

    String getFileName() {
        return fileName;
    }
}
