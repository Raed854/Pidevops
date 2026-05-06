package MemorIA.repository;

import MemorIA.entity.alerts.Alert;
import MemorIA.entity.alerts.Alert.AlertStatus;
import MemorIA.entity.alerts.Alert.AlertSeverity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    @Query("""
            SELECT a FROM Alert a
            JOIN FETCH a.patient p
            JOIN FETCH p.user
            LEFT JOIN FETCH a.createdBy
            LEFT JOIN FETCH a.assignedToUser
            LEFT JOIN FETCH a.resolvedByUser
            WHERE p.id = :patientId
            ORDER BY a.createdAt DESC
            """)
    List<Alert> findByPatientIdOrderByCreatedAtDesc(@Param("patientId") Long patientId);

    @Query("""
            SELECT DISTINCT a FROM Alert a
            JOIN FETCH a.patient p
            JOIN FETCH p.user
            LEFT JOIN FETCH a.createdBy
            LEFT JOIN FETCH a.assignedToUser
            LEFT JOIN FETCH a.resolvedByUser
            WHERE p.id IN :patientIds
            ORDER BY a.createdAt DESC
            """)
    List<Alert> findByPatientIdInOrderByCreatedAtDesc(@Param("patientIds") Collection<Long> patientIds);

    @Query("""
            SELECT a FROM Alert a
            JOIN FETCH a.patient p
            JOIN FETCH p.user
            LEFT JOIN FETCH a.createdBy
            LEFT JOIN FETCH a.assignedToUser
            LEFT JOIN FETCH a.resolvedByUser
            ORDER BY a.createdAt DESC
            """)
    List<Alert> findAllByOrderByCreatedAtDesc();

    @Query("""
            SELECT a FROM Alert a
            JOIN FETCH a.patient p
            JOIN FETCH p.user
            LEFT JOIN FETCH a.createdBy
            LEFT JOIN FETCH a.assignedToUser
            LEFT JOIN FETCH a.resolvedByUser
            WHERE a.id = :alertId
            """)
    Optional<Alert> findByIdWithRelations(@Param("alertId") Long alertId);

    @Query("""
            SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END
            FROM Alert a
            WHERE a.patient.id = :patientId
              AND a.reminderId = :reminderId
              AND a.type = :type
              AND a.status NOT IN ('RESOLVED', 'RESOLUE')
            """)
    boolean existsOpenReminderAlert(@Param("patientId") Long patientId,
                                    @Param("reminderId") Long reminderId,
                                    @Param("type") MemorIA.entity.alerts.AlertType type);

    @Query("""
            SELECT a.patient.id, COUNT(a)
            FROM Alert a
            WHERE a.patient.id IN :patientIds
              AND a.status NOT IN ('RESOLVED', 'RESOLUE')
            GROUP BY a.patient.id
            """)
    List<Object[]> countOpenAlertsByPatientIds(@Param("patientIds") Collection<Long> patientIds);

    /**
     * Cherche les alertes non traitées d'une sévérité donnée créées avant une certaine date
     * Utilisé pour l'escalade automatique
     */
    @Query("""
            SELECT a FROM Alert a
            WHERE a.status = :status
              AND a.severity = :severity
              AND a.createdAt < :beforeDate
            ORDER BY a.createdAt ASC
            """)
    List<Alert> findByStatusAndSeverityBefore(
            @Param("status") AlertStatus status,
            @Param("severity") AlertSeverity severity,
            @Param("beforeDate") LocalDateTime beforeDate
    );

    /**
     * Cherche les alertes résolues depuis longtemps (avant une certaine date)
     * Utilisé pour l'archivage automatique
     */
    @Query("""
            SELECT a FROM Alert a
            WHERE a.status IN ('RESOLVED', 'RESOLUE')
              AND a.resolvedAt IS NOT NULL
              AND a.resolvedAt < :beforeDate
            ORDER BY a.resolvedAt ASC
            """)
    List<Alert> findByStatusAndResolvedAtBefore(
            @Param("beforeDate") LocalDateTime beforeDate
    );

    /**
     * Alternative sans paramètre status explicite pour l'archivage
     */
    @Query("""
            SELECT a FROM Alert a
            WHERE a.resolvedAt IS NOT NULL
              AND a.resolvedAt < :beforeDate
            ORDER BY a.resolvedAt ASC
            """)
    List<Alert> findResolvedAlertsBefore(
            @Param("beforeDate") LocalDateTime beforeDate
    );

    /**
     * Compte les alertes non traitées pour un patient
     */
    @Query("""
            SELECT COUNT(a) FROM Alert a
            WHERE a.patient.id = :patientId
              AND a.status NOT IN ('RESOLVED', 'RESOLUE')
            """)
    long countUnresolvedByPatientId(@Param("patientId") Long patientId);

    /**
     * Compte les alertes critiques pour un patient
     */
    @Query("""
            SELECT COUNT(a) FROM Alert a
            WHERE a.patient.id = :patientId
              AND a.severity IN ('CRITICAL', 'CRITIQUE')
            """)
    long countCriticalByPatientId(@Param("patientId") Long patientId);

    /**
     * Compte les alertes escaladées non résolues
     */
    @Query("""
            SELECT COUNT(a) FROM Alert a
            WHERE a.escalated = true
              AND a.status NOT IN ('RESOLVED', 'RESOLUE')
            """)
    long countEscalatedUnresolved();

    /**
     * Find alerts for a patient created after a certain datetime (for daily/weekly summaries)
     */
    @Query("""
            SELECT a FROM Alert a
            JOIN FETCH a.patient p
            JOIN FETCH p.user
            LEFT JOIN FETCH a.createdBy
            LEFT JOIN FETCH a.assignedToUser
            LEFT JOIN FETCH a.resolvedByUser
            WHERE a.patient.id = :patientId
              AND a.createdAt >= :fromDateTime
            ORDER BY a.createdAt DESC
            """)
    List<Alert> findByPatientIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            @Param("patientId") Long patientId,
            @Param("fromDateTime") LocalDateTime fromDateTime
    );

    /**
     * Find alerts for a patient by type (e.g., WEATHER alerts)
     */
    @Query("""
            SELECT a FROM Alert a
            JOIN FETCH a.patient p
            JOIN FETCH p.user
            LEFT JOIN FETCH a.createdBy
            LEFT JOIN FETCH a.assignedToUser
            LEFT JOIN FETCH a.resolvedByUser
            WHERE a.patient.id = :patientId
              AND a.type = :type
            ORDER BY a.createdAt DESC
            """)
    List<Alert> findByPatientIdAndTypeOrderByCreatedAtDesc(
            @Param("patientId") Long patientId,
            @Param("type") MemorIA.entity.alerts.AlertType type
    );
}
