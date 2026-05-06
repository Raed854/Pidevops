package MemorIA.controller;

import MemorIA.entity.diagnostic.Notification;
import MemorIA.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getAllNotifications() {
        List<Notification> notifications = notificationService.getAllNotifications();
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Notification> getNotificationById(@PathVariable Long id) {
        return notificationService.getNotificationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Notification> createNotification(@RequestBody Notification notification) {
        Notification savedNotification = notificationService.saveNotification(notification);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedNotification);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Notification> updateNotification(@PathVariable Long id, @RequestBody Notification notification) {
        try {
            Notification updatedNotification = notificationService.updateNotification(id, notification);
            return ResponseEntity.ok(updatedNotification);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/mark-as-read")
    public ResponseEntity<Notification> markAsRead(@PathVariable Long id) {
        try {
            Notification notification = notificationService.markAsRead(id);
            return ResponseEntity.ok(notification);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/mark-as-unread")
    public ResponseEntity<Notification> markAsUnread(@PathVariable Long id) {
        try {
            Notification notification = notificationService.markAsUnread(id);
            return ResponseEntity.ok(notification);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getNotificationsByUserId(@PathVariable Long userId) {
        List<Notification> notifications = notificationService.getNotificationsByUserId(userId);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<List<Notification>> getUnreadNotificationsByUserId(@PathVariable Long userId) {
        List<Notification> notifications = notificationService.getUnreadNotificationsByUserId(userId);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/user/{userId}/read")
    public ResponseEntity<List<Notification>> getReadNotificationsByUserId(@PathVariable Long userId) {
        List<Notification> notifications = notificationService.getReadNotificationsByUserId(userId);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/user/{userId}/unread/count")
    public ResponseEntity<Long> countUnreadNotificationsByUserId(@PathVariable Long userId) {
        Long count = notificationService.countUnreadNotificationsByUserId(userId);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/rapport/{rapportId}")
    public ResponseEntity<List<Notification>> getNotificationsByRapportId(@PathVariable Long rapportId) {
        List<Notification> notifications = notificationService.getNotificationsByRapportId(rapportId);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/diagnostic/{diagnosticId}")
    public ResponseEntity<List<Notification>> getNotificationsByDiagnosticId(@PathVariable Long diagnosticId) {
        List<Notification> notifications = notificationService.getNotificationsByDiagnosticId(diagnosticId);
        return ResponseEntity.ok(notifications);
    }
}
