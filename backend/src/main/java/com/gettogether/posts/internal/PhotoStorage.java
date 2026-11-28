package com.gettogether.posts.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Component
class PhotoStorage {

    private final Path uploadsDir;

    PhotoStorage(@Value("${app.uploads.dir}") Path uploadsDir) {
        // Absolute, so the files land in the same place no matter which directory relative paths resolve against.
        this.uploadsDir = uploadsDir.toAbsolutePath().normalize();
    }

    /** Saves the file under a random name, so names never clash and say nothing about the original file. */
    String store(MultipartFile file, String extension) {
        String fileName = UUID.randomUUID() + "." + extension;
        try (InputStream content = file.getInputStream()) {
            Files.createDirectories(uploadsDir);
            Files.copy(content, uploadsDir.resolve(fileName));
        } catch (IOException exception) {
            throw new UncheckedIOException("Could not store photo " + fileName, exception);
        }
        return fileName;
    }
}
