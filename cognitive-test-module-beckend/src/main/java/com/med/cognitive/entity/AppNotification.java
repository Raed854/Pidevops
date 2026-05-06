package com.med.cognitive.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID du destinataire (médecin ou aidant) */
    @Column(name = "recipient_id")
    private Long recipientId;

    /** SOIGNANT ou AIDANT */
    @Column(name = "recipient_role")
    private String recipientRole;

    /** SCORE_ALERTE | TEST_COMPLETED | TEST_EXPIRY | DECISION_PENDING */
    @Column(name = "type")
    private String type;

    @Column(name = "title")
    private String title;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    /** INFO | WARNING | CRITICAL */
    @Column(name = "severity")
    private String severity;

    @Column(name = "is_read")
    private boolean read = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** URL de navigation lors du clic (ex: /patients/42) */
    @Column(name = "action_url")
    private String actionUrl;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "patient_name")
    private String patientName;

    /** z-score contextualisé (null si non pertinent) */
    @Column(name = "z_score")
    private Double zScore;

    /** Données supplémentaires (nom du test, etc.) */
    @Column(name = "extra_data")
    private String extraData;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
