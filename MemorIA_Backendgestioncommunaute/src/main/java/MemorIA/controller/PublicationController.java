package MemorIA.controller;

import MemorIA.entity.community.Publication;
import MemorIA.service.PublicationService;
import MemorIA.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
import java.util.HashMap;

import java.util.List;

@RestController
@RequestMapping("/publications")
@RequiredArgsConstructor
public class PublicationController {

    private final PublicationService publicationService;
    private final FileStorageService fileStorageService;

    @PostMapping("/upload-media")
    public Map<String, String> uploadMedia(@RequestParam("file") MultipartFile file) {
        String path = fileStorageService.store(file);
        Map<String, String> result = new HashMap<>();
        result.put("mediaUrl", path);
        result.put("fileName", file.getOriginalFilename());
        result.put("mediaType", file.getContentType());
        return result;
    }

    @PostMapping
    public Publication create(@RequestBody Publication publication) {
        return publicationService.create(publication);
    }

    @GetMapping
    public List<Publication> findAll() {
        return publicationService.findAll();
    }

    @GetMapping("/doctor/{doctorId}")
    public List<Publication> findByDoctor(@PathVariable Long doctorId) {
        return publicationService.findByDoctor(doctorId);
    }

    @GetMapping("/{id}")
    public Publication findById(@PathVariable Long id) {
        return publicationService.findById(id);
    }

    @PutMapping("/{id}")
    public Publication update(@PathVariable Long id, @RequestBody Publication publication) {
        return publicationService.update(id, publication);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        publicationService.delete(id);
    }
}
