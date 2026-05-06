package MemorIA.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import MemorIA.entity.diagnostic.Notification;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserId(Long userId);
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Notification> findByUserIdAndIsRead(Long userId, Boolean isRead);
    List<Notification> findByRapportIdRapport(Long rapportId);
    List<Notification> findByDiagnosticIdDiagnostic(Long diagnosticId);
    Long countByUserIdAndIsRead(Long userId, Boolean isRead);
}
