package MemorIA.repository;

import MemorIA.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for managing chat messages between doctors and caregivers
 */
@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /**
     * Get all chat messages for a specific patient
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.patient.id = :patientId ORDER BY cm.createdAt DESC")
    List<ChatMessage> findByPatientIdOrderByCreatedAtDesc(@Param("patientId") Long patientId);

    /**
     * Get unread messages for a patient
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.patient.id = :patientId AND cm.read = false ORDER BY cm.createdAt DESC")
    List<ChatMessage> findUnreadByPatientId(@Param("patientId") Long patientId);

    /**
     * Get chat messages between specific users for a patient (with pagination support)
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.patient.id = :patientId AND cm.sender.id IN :userIds ORDER BY cm.createdAt DESC")
    List<ChatMessage> findBetweenUsersForPatient(
            @Param("patientId") Long patientId,
            @Param("userIds") List<Long> userIds);

    /**
     * Get chat messages created within a time range
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.patient.id = :patientId AND cm.createdAt BETWEEN :startDate AND :endDate ORDER BY cm.createdAt ASC")
    List<ChatMessage> findByPatientAndDateRange(
            @Param("patientId") Long patientId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Get chat message count for a patient
     */
    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.patient.id = :patientId")
    long countByPatientId(@Param("patientId") Long patientId);
}
