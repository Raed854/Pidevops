package com.med.cognitive.controller;

import com.med.cognitive.entity.AppNotification;
import com.med.cognitive.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;

    /** Toutes les notifications non lues d'un destinataire */
    @GetMapping("/unread/{recipientId}")
    public ResponseEntity<List<AppNotification>> getUnread(@PathVariable Long recipientId) {
        return ResponseEntity.ok(notificationService.getUnread(recipientId));
    }

    /** Toutes les notifications (lues + non lues) */
    @GetMapping("/all/{recipientId}")
    public ResponseEntity<List<AppNotification>> getAll(@PathVariable Long recipientId) {
        return ResponseEntity.ok(notificationService.getAll(recipientId));
    }

    /** Compteur de notifications non lues */
    @GetMapping("/count/{recipientId}")
    public ResponseEntity<Map<String, Long>> countUnread(@PathVariable Long recipientId) {
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(recipientId)));
    }

    /** Marquer une notification comme lue */
    @PatchMapping("/{id}/read")
    public ResponseEntity<AppNotification> markRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markRead(id));
    }

    /** Marquer toutes les notifications comme lues */
    @PatchMapping("/mark-all-read/{recipientId}")
    public ResponseEntity<Map<String, String>> markAllRead(@PathVariable Long recipientId) {
        notificationService.markAllRead(recipientId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
