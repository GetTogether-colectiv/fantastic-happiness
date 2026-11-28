package com.gettogether.posts.internal;

import com.gettogether.shared.BadRequestException;
import com.gettogether.shared.NotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
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

    private static final String INVALID_FILE_NAME_MESSAGE = "Invalid file name";

    private final Path uploadsDir;

    PhotoStorage(@Value("${app.uploads.dir}") Path uploadsDir) {
        // Absolute, so the files land in the same place no matter which directory relative paths resolve against.
        this.uploadsDir = uploadsDir.toAbsolutePath().normalize();
    }

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

    Resource load(String fileName) {
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new BadRequestException(INVALID_FILE_NAME_MESSAGE);
        }
        Resource photo = new FileSystemResource(uploadsDir.resolve(fileName));
        if (!photo.isReadable()) {
            throw new NotFoundException("Photo " + fileName + " not found");
        }
        return photo;
    }
}
