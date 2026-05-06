package MemorIA.service;

import MemorIA.entity.diagnostic.Notification;
import MemorIA.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    private Notification notification;

    @BeforeEach
    void setUp() {
        notification = new Notification();
        notification.setId(1L);
        notification.setMessage("Hello");
        notification.setIsRead(false);
    }

    @Test
    @DisplayName("getAllNotifications: returns all notifications")
    void getAllNotifications_returnsAll() {
        when(notificationRepository.findAll()).thenReturn(List.of(notification));

        List<Notification> result = notificationService.getAllNotifications();

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getNotificationById: returns Optional from repository")
    void getNotificationById_returnsOptional() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notification));

        Optional<Notification> result = notificationService.getNotificationById(1L);

        assertTrue(result.isPresent());
    }

    @Test
    @DisplayName("saveNotification: persists the notification")
    void saveNotification_persists() {
        when(notificationRepository.save(notification)).thenReturn(notification);

        Notification result = notificationService.saveNotification(notification);

        assertEquals(notification, result);
    }

    @Test
    @DisplayName("updateNotification: updates message and read state")
    void updateNotification_updates() {
        Notification updates = new Notification();
        updates.setMessage("Updated");
        updates.setIsRead(true);

        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification result = notificationService.updateNotification(1L, updates);

        assertEquals("Updated", result.getMessage());
        assertTrue(result.getIsRead());
    }

    @Test
    @DisplayName("updateNotification: throws when notification is missing")
    void updateNotification_throwsWhenMissing() {
        when(notificationRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> notificationService.updateNotification(404L, new Notification()));
    }

    @Test
    @DisplayName("markAsRead: sets isRead to true")
    void markAsRead_setsTrue() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification result = notificationService.markAsRead(1L);

        assertTrue(result.getIsRead());
    }

    @Test
    @DisplayName("markAsUnread: sets isRead to false")
    void markAsUnread_setsFalse() {
        notification.setIsRead(true);
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification result = notificationService.markAsUnread(1L);

        assertFalse(result.getIsRead());
    }

    @Test
    @DisplayName("markAsRead: throws when notification is missing")
    void markAsRead_throwsWhenMissing() {
        when(notificationRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> notificationService.markAsRead(404L));
    }

    @Test
    @DisplayName("deleteNotification: delegates to repository")
    void deleteNotification_delegates() {
        notificationService.deleteNotification(1L);
        verify(notificationRepository).deleteById(1L);
    }

    @Test
    @DisplayName("getNotificationsByUserId: returns ordered list for user")
    void getNotificationsByUserId_returnsList() {
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(notification));

        List<Notification> result = notificationService.getNotificationsByUserId(1L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getUnreadNotificationsByUserId: returns unread notifications")
    void getUnreadNotificationsByUserId_returnsList() {
        when(notificationRepository.findByUserIdAndIsRead(1L, false))
                .thenReturn(List.of(notification));

        List<Notification> result = notificationService.getUnreadNotificationsByUserId(1L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getReadNotificationsByUserId: returns read notifications")
    void getReadNotificationsByUserId_returnsList() {
        when(notificationRepository.findByUserIdAndIsRead(1L, true))
                .thenReturn(List.of());

        List<Notification> result = notificationService.getReadNotificationsByUserId(1L);

        assertEquals(0, result.size());
    }

    @Test
    @DisplayName("getNotificationsByRapportId: returns notifications for rapport")
    void getNotificationsByRapportId_returnsList() {
        when(notificationRepository.findByRapportIdRapport(7L))
                .thenReturn(List.of(notification));

        List<Notification> result = notificationService.getNotificationsByRapportId(7L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getNotificationsByDiagnosticId: returns notifications for diagnostic")
    void getNotificationsByDiagnosticId_returnsList() {
        when(notificationRepository.findByDiagnosticIdDiagnostic(8L))
                .thenReturn(List.of(notification));

        List<Notification> result = notificationService.getNotificationsByDiagnosticId(8L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("countUnreadNotificationsByUserId: returns count from repository")
    void countUnreadNotificationsByUserId_returnsCount() {
        when(notificationRepository.countByUserIdAndIsRead(1L, false)).thenReturn(3L);

        Long count = notificationService.countUnreadNotificationsByUserId(1L);

        assertEquals(3L, count);
    }
}
