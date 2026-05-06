package MemorIA.service;

import MemorIA.entity.diagnostic.Notification;
import MemorIA.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public List<Notification> getAllNotifications() {
        return notificationRepository.findAll();
    }

    public Optional<Notification> getNotificationById(Long id) {
        return notificationRepository.findById(id);
    }

    public Notification saveNotification(Notification notification) {
        return notificationRepository.save(notification);
    }

    public Notification updateNotification(Long id, Notification notificationDetails) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + id));
        
        notification.setMessage(notificationDetails.getMessage());
        notification.setIsRead(notificationDetails.getIsRead());
        notification.setUser(notificationDetails.getUser());
        notification.setRapport(notificationDetails.getRapport());
        notification.setDiagnostic(notificationDetails.getDiagnostic());
        
        return notificationRepository.save(notification);
    }

    public Notification markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + id));
        
        notification.setIsRead(true);
        return notificationRepository.save(notification);
    }

    public Notification markAsUnread(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + id));
        
        notification.setIsRead(false);
        return notificationRepository.save(notification);
    }

    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }

    public List<Notification> getNotificationsByUserId(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotificationsByUserId(Long userId) {
        return notificationRepository.findByUserIdAndIsRead(userId, false);
    }

    public List<Notification> getReadNotificationsByUserId(Long userId) {
        return notificationRepository.findByUserIdAndIsRead(userId, true);
    }

    public List<Notification> getNotificationsByRapportId(Long rapportId) {
        return notificationRepository.findByRapportIdRapport(rapportId);
    }

    public List<Notification> getNotificationsByDiagnosticId(Long diagnosticId) {
        return notificationRepository.findByDiagnosticIdDiagnostic(diagnosticId);
    }

    public Long countUnreadNotificationsByUserId(Long userId) {
        return notificationRepository.countByUserIdAndIsRead(userId, false);
    }
}
