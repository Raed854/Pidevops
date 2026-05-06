package MemorIA.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/** Service for storing uploaded images */
@Service
public class FileStorageService {

    private final Path root;

    public FileStorageService(@Value("${memoria.upload.dir:uploads}") String uploadDir) {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    /** Save file, return relative path */
    public String store(MultipartFile file) {
        String orig = file.getOriginalFilename();
        String ext = "";
        if (orig != null && orig.contains(".")) {
            ext = orig.substring(orig.lastIndexOf("."));
        }

        String filename = UUID.randomUUID().toString() + ext;
        try {
            Files.createDirectories(root);
            Path dest = root.resolve(filename);
            file.transferTo(dest.toFile());
            return filename; // Return just the filename since it's in root
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    public Path resolve(String relativePath) {
        return root.resolve(relativePath).normalize();
    }
}
