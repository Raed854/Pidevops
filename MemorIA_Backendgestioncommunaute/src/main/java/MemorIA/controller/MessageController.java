package MemorIA.controller;

import MemorIA.dto.SendMessageRequest;
import MemorIA.entity.community.Message;
import MemorIA.service.FileStorageService;
import MemorIA.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import java.io.IOException;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final FileStorageService fileStorageService;

    @PostMapping
    public Message send(@RequestParam("userId") Long userId, @RequestParam("conversationId") Long conversationId,
            @RequestBody SendMessageRequest req) {
        return messageService.send(userId, conversationId,
                req.getContent(), req.getImageUrl(), req.getFileUrl(), req.getFileType(), req.getTags(),
                req.getForwardedFromMessageId(), req.getReplyToMessageId());
    }

    @PostMapping("/upload-image")
    public Map<String, String> uploadImage(@RequestParam("file") MultipartFile file) {
        String path = fileStorageService.store(file);
        Map<String, String> result = new HashMap<>();
        result.put("imageUrl", path);
        return result;
    }

    @PostMapping("/upload-file")
    public Map<String, String> uploadFile(@RequestParam("file") MultipartFile file) {
        String path = fileStorageService.store(file);
        Map<String, String> result = new HashMap<>();
        result.put("fileUrl", path);
        result.put("fileName", file.getOriginalFilename());
        result.put("fileType", file.getContentType());
        return result;
    }

    @GetMapping("/files")
    public ResponseEntity<Resource> serveFile(@RequestParam("path") String path) throws IOException {
        var file = fileStorageService.resolve(path).toFile();
        if (!file.exists())
            return ResponseEntity.notFound().build();
            
        Resource resource = new UrlResource(file.toURI());
        
        String contentType = Files.probeContentType(file.toPath());
        if (contentType == null)
            contentType = "application/octet-stream";
            
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }

    @GetMapping("/conversation/{id}")
    public List<Message> getByConversation(@PathVariable("id") Long id) {
        return messageService.getByConversation(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable("id") Long id, @RequestParam("userId") Long userId) {
        messageService.deleteMessage(id, userId);
    }

    @PutMapping("/{id}")
    public Message update(@PathVariable("id") Long id, @RequestParam("userId") Long userId, @RequestBody Map<String, String> body) {
        return messageService.updateMessage(id, userId, body.get("content"), body.get("tags"));
    }

    @PostMapping("/{id}/transcribe")
    public Message transcribe(@PathVariable("id") Long id) {
        return messageService.transcribeMessage(id);
    }

    @PostMapping("/forward")
    public Message forward(@RequestParam("userId") Long userId, @RequestParam("messageId") Long messageId,
            @RequestParam("toConversationId") Long toConversationId) {
        return messageService.forward(userId, messageId, toConversationId);
    }

    @GetMapping("/search")
    public List<Message> search(@RequestParam("query") String query) {
        return messageService.search(query);
    }

    @GetMapping("/conversation/{id}/media")
    public List<Message> getMediaByConversation(@PathVariable("id") Long id) {
        return messageService.getMediaByConversation(id);
    }
}
