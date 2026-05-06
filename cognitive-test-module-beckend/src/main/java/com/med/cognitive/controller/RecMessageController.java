package com.med.cognitive.controller;

import com.med.cognitive.dto.CreateRecMessageDto;
import com.med.cognitive.dto.RecMessageDto;
import com.med.cognitive.entity.RecMessage;
import com.med.cognitive.service.RecMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller REST pour la gestion des messages de recommandation.
 * Base URL : /api/recommendations/{recId}/messages
 */
@RestController
@RequestMapping("/api/recommendations/{recId}/messages")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RecMessageController {

    private final RecMessageService messageService;

    /**
     * Récupère tous les messages d'une recommandation
     * GET /api/recommendations/{recId}/messages
     */
    @GetMapping
    public ResponseEntity<List<RecMessageDto>> getMessages(@PathVariable Long recId) {
        List<RecMessage> messages = messageService.getMessagesForRecommendation(recId);
        List<RecMessageDto> dtos = messages.stream()
            .map(RecMessageDto::fromEntity)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Crée un nouveau message pour une recommandation
     * POST /api/recommendations/{recId}/messages
     */
    @PostMapping
    public ResponseEntity<RecMessageDto> createMessage(
            @PathVariable Long recId,
            @Valid @RequestBody CreateRecMessageDto dto) {
        RecMessage message = messageService.createMessage(
            recId,
            dto.getText(),
            dto.getFrom(),
            dto.getPriority()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(RecMessageDto.fromEntity(message));
    }

    /**
     * Marque un message comme lu
     * PATCH /api/recommendations/{recId}/messages/{messageId}/read
     */
    @PatchMapping("/{messageId}/read")
    public ResponseEntity<RecMessageDto> markAsRead(
            @PathVariable Long recId,
            @PathVariable Long messageId,
            @RequestParam Long readBy) {
        RecMessage message = messageService.markAsRead(messageId, readBy);
        return ResponseEntity.ok(RecMessageDto.fromEntity(message));
    }

    /**
     * Marque tous les messages d'une recommandation comme lus
     * PATCH /api/recommendations/{recId}/messages/read-all
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @PathVariable Long recId,
            @RequestParam RecMessage.SenderType senderType,
            @RequestParam Long readBy) {
        messageService.markAllAsRead(recId, senderType, readBy);
        return ResponseEntity.noContent().build();
    }

    /**
     * Récupère les messages non lus envoyés par l'aidant
     * GET /api/recommendations/{recId}/messages/unread/aidant
     */
    @GetMapping("/unread/aidant")
    public ResponseEntity<List<RecMessageDto>> getUnreadFromAidant(@PathVariable Long recId) {
        List<RecMessage> messages = messageService.getUnreadFromAidant(recId);
        List<RecMessageDto> dtos = messages.stream()
            .map(RecMessageDto::fromEntity)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Récupère les messages non lus envoyés par le médecin
     * GET /api/recommendations/{recId}/messages/unread/medecin
     */
    @GetMapping("/unread/medecin")
    public ResponseEntity<List<RecMessageDto>> getUnreadFromMedecin(@PathVariable Long recId) {
        List<RecMessage> messages = messageService.getUnreadFromMedecin(recId);
        List<RecMessageDto> dtos = messages.stream()
            .map(RecMessageDto::fromEntity)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Supprime un message
     * DELETE /api/recommendations/{recId}/messages/{messageId}
     */
    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long messageId) {
        messageService.deleteMessage(messageId);
        return ResponseEntity.noContent().build();
    }
}
