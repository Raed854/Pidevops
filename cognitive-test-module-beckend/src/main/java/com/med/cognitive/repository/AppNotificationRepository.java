package com.med.cognitive.repository;

import com.med.cognitive.entity.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {

    List<AppNotification> findByRecipientIdAndReadFalseOrderByCreatedAtDesc(Long recipientId);

    List<AppNotification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    long countByRecipientIdAndReadFalse(Long recipientId);

    @Modifying
    @Query("UPDATE AppNotification n SET n.read = true WHERE n.recipientId = :recipientId")
    void markAllReadByRecipient(@Param("recipientId") Long recipientId);
}
